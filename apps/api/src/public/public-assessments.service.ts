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
  type TranscriptTurnInput,
} from '@clientready/shared';
import {
  acceptsSessionData,
  canResume,
  elapsedMs,
  isFinished,
  isLinkExpired,
  isOverdue,
  MIN_RESUME_REMAINING_MS,
  remainingMs,
} from '../assessments/assessment-rules';
import { Clock } from '../common/clock';
import { PublicError } from '../common/public-error';
import type { Env } from '../config/env';
import type { Assessment } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildClientInstructions,
  buildTimeCues,
  CLIENT_PROMPT_VERSION,
} from '../prompts/client/v2';
import {
  RealtimeSecretProvider,
  RealtimeUnavailableError,
} from '../realtime/realtime-secret.provider';

const STARTABLE: AssessmentStatus[] = ['CREATED', 'IN_PROGRESS'];

@Injectable()
export class PublicAssessmentsService {
  private readonly logger = new Logger(PublicAssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
    private readonly realtime: RealtimeSecretProvider,
  ) {}

  /** Loads an assessment by candidate token, applying expiry and overdue auto-completion. */
  async findByToken(token: string): Promise<Assessment> {
    const assessment = await this.prisma.assessment.findUnique({ where: { token } });
    if (!assessment) throw new PublicError('NOT_FOUND');

    const now = this.clock.now();
    if (isLinkExpired(assessment, now, this.config.get('LINK_TTL_DAYS', { infer: true }))) {
      throw new PublicError('LINK_EXPIRED');
    }
    if (isOverdue(assessment, now)) {
      return this.complete(assessment, 'overdue');
    }
    return assessment;
  }

  toView(assessment: Assessment): PublicAssessmentView {
    const now = this.clock.now();
    return {
      status: assessment.status,
      candidateName: assessment.candidateName,
      roleName: getRoleTemplate(assessment.roleTemplateId)?.name ?? assessment.roleTemplateId,
      consentGiven: assessment.consentAt !== null,
      durationLimitMs: SESSION_HARD_LIMIT_MS,
      elapsedMs: elapsedMs(assessment, now),
      canStart: assessment.status === 'CREATED',
      canResume: canResume(assessment, now),
    };
  }

  async giveConsent(token: string): Promise<PublicAssessmentView> {
    const assessment = await this.findByToken(token);
    if (!STARTABLE.includes(assessment.status)) throw new PublicError('ALREADY_COMPLETED');
    if (assessment.consentAt) return this.toView(assessment);

    const updated = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: { consentAt: this.clock.now() },
    });
    this.logger.log(`Assessment ${assessment.id}: consent given`);
    return this.toView(updated);
  }

  async createRealtimeSession(token: string): Promise<RealtimeSessionResult> {
    const assessment = await this.findByToken(token);
    const now = this.clock.now();

    if (!STARTABLE.includes(assessment.status)) throw new PublicError('ALREADY_COMPLETED');
    if (!assessment.consentAt) throw new PublicError('CONSENT_REQUIRED');
    if (
      assessment.status === 'IN_PROGRESS' &&
      remainingMs(assessment, now) < MIN_RESUME_REMAINING_MS
    ) {
      await this.complete(assessment, 'time up on reconnect');
      throw new PublicError('TIME_UP');
    }

    const template = getRoleTemplate(assessment.roleTemplateId);
    if (!template) {
      this.logger.error(`Assessment ${assessment.id}: unknown role ${assessment.roleTemplateId}`);
      throw new InternalServerErrorException();
    }

    // Claim a connection slot atomically (also guards against concurrent starts).
    const claimed = await this.prisma.assessment.updateMany({
      where: {
        id: assessment.id,
        status: { in: STARTABLE },
        connectCount: { lt: this.config.get('MAX_REALTIME_CONNECTS', { infer: true }) },
      },
      data: { connectCount: { increment: 1 } },
    });
    if (claimed.count === 0) throw new PublicError('TOO_MANY_CONNECTIONS');

    const isResume = assessment.startedAt !== null;
    const turns = isResume
      ? await this.prisma.transcriptTurn.findMany({
          where: { assessmentId: assessment.id },
          orderBy: [{ startedAtMs: 'asc' }, { seq: 'asc' }],
          select: { speaker: true, text: true, seq: true },
        })
      : [];
    const elapsed = elapsedMs(assessment, now);

    const instructions = buildClientInstructions({
      template,
      level: assessment.targetLevel,
      candidateName: assessment.candidateName,
      resume: isResume ? { elapsedMs: elapsed, turns } : undefined,
    });

    let secret;
    try {
      secret = await this.realtime.createSecret({
        instructions,
        safetyIdentifier: createHash('sha256').update(assessment.id).digest('hex'),
      });
    } catch (error) {
      if (error instanceof RealtimeUnavailableError) {
        throw new PublicError('REALTIME_UNAVAILABLE');
      }
      throw error;
    }

    await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: assessment.startedAt ?? now,
        realtimeModel: secret.model,
        promptVersion: CLIENT_PROMPT_VERSION,
      },
    });
    this.logger.log(
      `Assessment ${assessment.id}: realtime session ${isResume ? 'resumed' : 'started'} ` +
        `(model=${secret.model}, prompt=${CLIENT_PROMPT_VERSION}, elapsed=${elapsed}ms)`,
    );

    const maxSeq = turns.reduce((max, t) => Math.max(max, t.seq), -1);
    return {
      clientSecret: secret.value,
      expiresAt: secret.expiresAt,
      model: secret.model,
      isResume,
      elapsedMs: elapsed,
      remainingMs: SESSION_HARD_LIMIT_MS - elapsed,
      nextSeq: maxSeq + 1,
      timeCues: buildTimeCues(template).filter((cue) => cue.atMs > elapsed),
    };
  }

  async saveTurns(token: string, turns: TranscriptTurnInput[]): Promise<{ saved: number }> {
    const assessment = await this.findByToken(token);
    if (!acceptsSessionData(assessment, this.clock.now())) {
      if (isFinished(assessment.status)) throw new PublicError('ALREADY_COMPLETED');
      throw new ConflictException('Conversation has not started');
    }
    // Upsert on (assessmentId, seq) so the browser can safely retry.
    await this.prisma.$transaction(
      turns.map((turn) =>
        this.prisma.transcriptTurn.upsert({
          where: { assessmentId_seq: { assessmentId: assessment.id, seq: turn.seq } },
          create: { assessmentId: assessment.id, ...turn },
          update: { speaker: turn.speaker, text: turn.text, startedAtMs: turn.startedAtMs },
        }),
      ),
    );
    return { saved: turns.length };
  }

  async end(token: string): Promise<PublicAssessmentView> {
    const assessment = await this.findByToken(token);
    if (assessment.status === 'CREATED') {
      throw new ConflictException('Conversation has not started');
    }
    if (assessment.status !== 'IN_PROGRESS') return this.toView(assessment);
    return this.toView(await this.complete(assessment, 'ended by client'));
  }

  private async complete(assessment: Assessment, reason: string): Promise<Assessment> {
    const now = this.clock.now();
    // Never record an end past the hard limit (e.g. when closed lazily later).
    const hardEnd = assessment.startedAt
      ? new Date(assessment.startedAt.getTime() + SESSION_HARD_LIMIT_MS)
      : now;
    const endedAt = now < hardEnd ? now : hardEnd;
    const result = await this.prisma.assessment.updateMany({
      where: { id: assessment.id, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', endedAt },
    });
    if (result.count > 0) {
      this.logger.log(`Assessment ${assessment.id}: completed (${reason})`);
    }
    return this.prisma.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
  }
}
