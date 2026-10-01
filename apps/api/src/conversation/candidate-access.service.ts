import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESSION_HARD_LIMIT_MS } from '@clientready/shared';
import {
  acceptsSessionData,
  isFinished,
  isLinkExpired,
  isOverdue,
} from '../assessments/assessment-rules';
import type { Env } from '../config/env';
import { EvaluationScheduler } from '../evaluation/evaluation-scheduler.service';
import type { Assessment } from '../generated/prisma/client';
import { Clock } from '../infra/clock';
import { PublicError } from '../infra/http/public-error';
import { PrismaService } from '../infra/prisma/prisma.service';

/**
 * Resolves the candidate's link token to an assessment and owns the end of a session:
 * every candidate-facing request goes through `findByToken`, so expiry and the lazy
 * auto-completion of abandoned sessions are applied in one place.
 */
@Injectable()
export class CandidateAccessService {
  private readonly logger = new Logger(CandidateAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
    private readonly evaluation: EvaluationScheduler,
  ) {}

  /** Throws NOT_FOUND / LINK_EXPIRED; completes a session the browser abandoned. */
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

  /** Transcript turns and recordings are accepted only during and shortly after the call. */
  assertAcceptsSessionData(assessment: Assessment): void {
    if (acceptsSessionData(assessment, this.clock.now())) return;
    if (isFinished(assessment.status)) throw new PublicError('ALREADY_COMPLETED');
    throw new ConflictException('Conversation has not started');
  }

  /** IN_PROGRESS -> COMPLETED (idempotent) and schedules the evaluation. */
  async complete(assessment: Assessment, reason: string): Promise<Assessment> {
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
      this.evaluation.schedule(assessment.id);
    }
    return this.prisma.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
  }
}
