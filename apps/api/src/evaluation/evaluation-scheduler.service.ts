import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import type { Report } from '../generated/prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { EvaluationNotPossibleError, EvaluationService } from './evaluation.service';
import { EvaluationProviderError } from './providers/provider';

/**
 * Runs evaluations in-process, one at a time (pilot volume is a few per month).
 * Started automatically when a session is completed; retried with backoff on transient
 * errors; assessments still COMPLETED after a restart are picked up again.
 */
@Injectable()
export class EvaluationScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(EvaluationScheduler.name);
  /** Tail of the serial queue: every evaluation waits for the previous one. */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly scheduled = new Set<string>();
  private shuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly evaluation: EvaluationService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Sessions completed while the API was down (or mid-evaluation) are still COMPLETED.
    const pending = await this.prisma.assessment.findMany({
      where: { status: 'COMPLETED' },
      select: { id: true },
    });
    for (const { id } of pending) this.schedule(id);
    if (pending.length > 0) {
      this.logger.log(`Resuming ${pending.length} pending evaluation(s)`);
    }
  }

  onApplicationShutdown(): void {
    this.shuttingDown = true;
    for (const timer of this.timers) clearTimeout(timer);
  }

  /** Schedules the automatic evaluation (fire and forget). */
  schedule(
    assessmentId: string,
    delayMs = this.config.get('EVAL_START_DELAY_MS', { infer: true }),
  ): void {
    if (this.scheduled.has(assessmentId) || this.shuttingDown) return;
    this.scheduled.add(assessmentId);
    this.later(delayMs, () => void this.runAutomatic(assessmentId, 1));
  }

  /**
   * Evaluates now (recruiter re-run for calibration), queued behind running evaluations.
   * Throws on failure without changing the assessment status.
   */
  evaluateNow(assessmentId: string): Promise<Report> {
    return this.enqueue(() => this.evaluation.evaluateAndStore(assessmentId));
  }

  private async runAutomatic(assessmentId: string, attempt: number): Promise<void> {
    if (this.shuttingDown) return;
    try {
      await this.enqueue(async () => {
        const current = await this.prisma.assessment.findUnique({
          where: { id: assessmentId },
          select: { status: true },
        });
        // Deleted, re-run manually or otherwise no longer waiting for evaluation.
        if (current?.status !== 'COMPLETED') return;
        await this.prisma.assessment.update({
          where: { id: assessmentId },
          data: { evaluationAttempts: { increment: 1 } },
        });
        await this.evaluation.evaluateAndStore(assessmentId);
      });
      this.scheduled.delete(assessmentId);
    } catch (error) {
      await this.handleFailure(assessmentId, attempt, error);
    }
  }

  private async handleFailure(assessmentId: string, attempt: number, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const maxAttempts = this.config.get('EVAL_MAX_ATTEMPTS', { infer: true });

    if (isRetryable(error) && attempt < maxAttempts) {
      const delay = this.config.get('EVAL_RETRY_DELAY_MS', { infer: true }) * 2 ** (attempt - 1);
      this.logger.warn(
        `Assessment ${assessmentId}: evaluation attempt ${attempt}/${maxAttempts} failed (${message}); retrying in ${Math.round(delay / 1000)} s`,
      );
      await this.prisma.assessment
        .update({ where: { id: assessmentId }, data: { evaluationError: message } })
        .catch(() => undefined);
      this.later(delay, () => void this.runAutomatic(assessmentId, attempt + 1));
      return;
    }

    this.scheduled.delete(assessmentId);
    this.logger.error(`Assessment ${assessmentId}: evaluation failed: ${message}`);
    await this.prisma.assessment
      .updateMany({
        where: { id: assessmentId, status: 'COMPLETED' },
        data: { status: 'FAILED', evaluationError: message },
      })
      .catch(() => undefined);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private later(delayMs: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, delayMs);
    this.timers.add(timer);
  }
}

/** Unknown errors (e.g. database hiccups) are retried; configuration problems are not. */
function isRetryable(error: unknown): boolean {
  if (error instanceof EvaluationProviderError) return error.retryable;
  return !(error instanceof EvaluationNotPossibleError);
}
