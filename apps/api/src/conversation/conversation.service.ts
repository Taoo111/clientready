import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  getRoleTemplate,
  SESSION_HARD_LIMIT_MS,
  type AssessmentStatus,
  type PublicAssessmentView,
  type RealtimeSessionResult,
  type RoleTemplate,
  type TranscriptTurnInput,
  type UsageReportInput,
} from '@clientready/shared';
import { elapsedMs, MIN_RESUME_REMAINING_MS, remainingMs } from '../assessments/assessment-rules';
import type { Env } from '../config/env';
import type { Assessment } from '../generated/prisma/client';
import { Clock } from '../infra/clock';
import { PublicError } from '../infra/http/public-error';
import { PrismaService } from '../infra/prisma/prisma.service';
import { currentClientPrompt } from '../prompts/client';
import { CandidateAccessService } from './candidate-access.service';
import { toPublicView } from './public-view';
import {
  RealtimeSecretProvider,
  RealtimeUnavailableError,
} from './realtime/realtime-secret.provider';

const STARTABLE: AssessmentStatus[] = ['CREATED', 'IN_PROGRESS'];

/**
 * The candidate's conversation, step by step: view -> consent -> realtime session
 * (start or resume) -> transcript turns -> end. Authorised only by the link token.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
    private readonly access: CandidateAccessService,
    private readonly realtime: RealtimeSecretProvider,
  ) {}

  async view(token: string): Promise<PublicAssessmentView> {
    return this.toView(await this.access.findByToken(token));
  }

  async giveConsent(token: string): Promise<PublicAssessmentView> {
    const assessment = await this.access.findByToken(token);
    if (!STARTABLE.includes(assessment.status)) throw new PublicError('ALREADY_COMPLETED');
    if (assessment.consentAt) return this.toView(assessment);

    const updated = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: { consentAt: this.clock.now() },
    });
    this.logger.log(`Assessment ${assessment.id}: consent given`);
    return this.toView(updated);
  }

  /**
   * Mints a short-lived realtime secret for the browser. The first call starts the clock;
   * later calls resume (the AI gets the transcript so far). Instructions never leave the server.
   */
  async startRealtimeSession(token: string): Promise<RealtimeSessionResult> {
    const assessment = await this.access.findByToken(token);
    const now = this.clock.now();
    await this.assertCanConnect(assessment, now);
    const template = this.templateOf(assessment);
    await this.claimConnection(assessment);

    const isResume = assessment.startedAt !== null;
    const turns = isResume ? await this.transcriptSoFar(assessment.id) : [];
    const elapsed = elapsedMs(assessment, now);
    const instructions = currentClientPrompt.buildClientInstructions({
      template,
      level: assessment.targetLevel,
      candidateName: assessment.candidateName,
      resume: isResume ? { elapsedMs: elapsed, turns } : undefined,
    });
    const secret = await this.createSecret(assessment, instructions);

    await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: assessment.startedAt ?? now,
        realtimeModel: secret.model,
        promptVersion: currentClientPrompt.CLIENT_PROMPT_VERSION,
      },
    });
    this.logger.log(
      `Assessment ${assessment.id}: realtime session ${isResume ? 'resumed' : 'started'} ` +
        `(model=${secret.model}, prompt=${currentClientPrompt.CLIENT_PROMPT_VERSION}, elapsed=${elapsed}ms)`,
    );

    const maxSeq = turns.reduce((max, turn) => Math.max(max, turn.seq), -1);
    return {
      clientSecret: secret.value,
      expiresAt: secret.expiresAt,
      model: secret.model,
      isResume,
      elapsedMs: elapsed,
      remainingMs: SESSION_HARD_LIMIT_MS - elapsed,
      nextSeq: maxSeq + 1,
      timeCues: currentClientPrompt.buildTimeCues(template).filter((cue) => cue.atMs > elapsed),
      paceNotes: currentClientPrompt.buildPaceNotes?.() ?? null,
    };
  }

  /** Upserts on (assessmentId, seq), so the browser can safely retry. */
  async saveTurns(token: string, turns: TranscriptTurnInput[]): Promise<{ saved: number }> {
    const assessment = await this.access.findByToken(token);
    this.access.assertAcceptsSessionData(assessment);
    await this.prisma.$transaction(
      turns.map((turn) =>
        this.prisma.transcriptTurn.upsert({
          where: { assessmentId_seq: { assessmentId: assessment.id, seq: turn.seq } },
          create: { assessmentId: assessment.id, ...turn },
          update: {
            speaker: turn.speaker,
            text: turn.text,
            startedAtMs: turn.startedAtMs,
            durationMs: turn.durationMs ?? null,
          },
        }),
      ),
    );
    return { saved: turns.length };
  }

  /** Running totals per connection: upserted, so resending replaces the previous totals. */
  async saveUsage(token: string, input: UsageReportInput): Promise<void> {
    const assessment = await this.access.findByToken(token);
    this.access.assertAcceptsSessionData(assessment);
    const rows = [
      { source: 'REALTIME', model: assessment.realtimeModel ?? 'unknown', usage: input.realtime },
      {
        source: 'TRANSCRIPTION',
        model: this.config.get('OPENAI_TRANSCRIBE_MODEL', { infer: true }),
        usage: input.transcription,
      },
    ] as const;
    await this.prisma.$transaction(
      rows.map(({ source, model, usage }) =>
        this.prisma.usageRecord.upsert({
          where: {
            assessmentId_source_ref: {
              assessmentId: assessment.id,
              source,
              ref: input.connectionId,
            },
          },
          create: { assessmentId: assessment.id, source, model, ref: input.connectionId, ...usage },
          update: usage,
        }),
      ),
    );
  }

  async end(token: string): Promise<PublicAssessmentView> {
    const assessment = await this.access.findByToken(token);
    if (assessment.status === 'CREATED') {
      throw new ConflictException('Conversation has not started');
    }
    if (assessment.status !== 'IN_PROGRESS') return this.toView(assessment);
    return this.toView(await this.access.complete(assessment, 'ended by client'));
  }

  private async assertCanConnect(assessment: Assessment, now: Date): Promise<void> {
    if (!STARTABLE.includes(assessment.status)) throw new PublicError('ALREADY_COMPLETED');
    if (!assessment.consentAt) throw new PublicError('CONSENT_REQUIRED');
    if (
      assessment.status === 'IN_PROGRESS' &&
      remainingMs(assessment, now) < MIN_RESUME_REMAINING_MS
    ) {
      await this.access.complete(assessment, 'time up on reconnect');
      throw new PublicError('TIME_UP');
    }
  }

  /** Counts connections atomically (bounds cost, also guards against concurrent starts). */
  private async claimConnection(assessment: Assessment): Promise<void> {
    const claimed = await this.prisma.assessment.updateMany({
      where: {
        id: assessment.id,
        status: { in: STARTABLE },
        connectCount: { lt: this.config.get('MAX_REALTIME_CONNECTS', { infer: true }) },
      },
      data: { connectCount: { increment: 1 } },
    });
    if (claimed.count === 0) throw new PublicError('TOO_MANY_CONNECTIONS');
  }

  private transcriptSoFar(assessmentId: string) {
    return this.prisma.transcriptTurn.findMany({
      where: { assessmentId },
      orderBy: [{ startedAtMs: 'asc' }, { seq: 'asc' }],
      select: { speaker: true, text: true, seq: true },
    });
  }

  private async createSecret(assessment: Assessment, instructions: string) {
    try {
      return await this.realtime.createSecret({
        instructions,
        tools: currentClientPrompt.buildTools?.() ?? [],
        safetyIdentifier: createHash('sha256').update(assessment.id).digest('hex'),
      });
    } catch (error) {
      if (error instanceof RealtimeUnavailableError) throw new PublicError('REALTIME_UNAVAILABLE');
      throw error;
    }
  }

  private templateOf(assessment: Assessment): RoleTemplate {
    const template = getRoleTemplate(assessment.roleTemplateId);
    if (!template) {
      this.logger.error(`Assessment ${assessment.id}: unknown role ${assessment.roleTemplateId}`);
      throw new InternalServerErrorException('Unknown role template');
    }
    return template;
  }

  private toView(assessment: Assessment): PublicAssessmentView {
    return toPublicView(assessment, this.templateOf(assessment), this.clock.now());
  }
}
