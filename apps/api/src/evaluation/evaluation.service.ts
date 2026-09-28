import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRoleTemplate } from '@clientready/shared';
import type { Env } from '../config/env';
import type { Prisma, Report } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateConversation } from './evaluate';
import { EvaluationProvider, EvaluationProviderError } from './provider';

export class EvaluationNotPossibleError extends Error {}

/**
 * Runs evaluations in-process, one at a time (pilot volume is a few per month).
 * Started automatically when a session is completed; retried on transient errors;
 * pending evaluations are picked up again after a restart.
 */
@Injectable()
export class EvaluationService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(EvaluationService.name);
  private queue: Promise<unknown> = Promise.resolve();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly scheduled = new Set<string>();
  private shuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly provider: EvaluationProvider,
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

  private later(delayMs: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, delayMs);
    this.timers.add(timer);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async runAutomatic(assessmentId: string, attempt: number): Promise<void> {
    if (this.shuttingDown) return;
    const maxAttempts = this.config.get('EVAL_MAX_ATTEMPTS', { infer: true });
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
        await this.evaluateAndStore(assessmentId);
      });
      this.scheduled.delete(assessmentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Unknown errors (e.g. database hiccups) are retried; configuration problems are not.
      const retryable =
        error instanceof EvaluationProviderError
          ? error.retryable
          : !(error instanceof EvaluationNotPossibleError);
      if (retryable && attempt < maxAttempts) {
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
  }

  /**
   * Evaluates now (admin re-run for calibration). Adds a new report; the previous
   * ones are kept. Throws on failure without changing the assessment status.
   */
  evaluateNow(assessmentId: string): Promise<Report> {
    return this.enqueue(() => this.evaluateAndStore(assessmentId));
  }

  private async evaluateAndStore(assessmentId: string): Promise<Report> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { turns: true },
    });
    if (!assessment) throw new EvaluationNotPossibleError('Assessment not found');
    if (!['COMPLETED', 'EVALUATED', 'FAILED'].includes(assessment.status)) {
      throw new EvaluationNotPossibleError(
        `Cannot evaluate an assessment in status ${assessment.status}`,
      );
    }
    const template = getRoleTemplate(assessment.roleTemplateId);
    if (!template) {
      throw new EvaluationNotPossibleError(`Unknown role template ${assessment.roleTemplateId}`);
    }

    const conversationMs =
      assessment.startedAt && assessment.endedAt
        ? assessment.endedAt.getTime() - assessment.startedAt.getTime()
        : 0;
    const started = Date.now();
    const result = await evaluateConversation(
      {
        template,
        targetLevel: assessment.targetLevel,
        turns: assessment.turns,
        conversationMs,
        thresholds: {
          minConversationMs: this.config.get('EVAL_MIN_CONVERSATION_SEC', { infer: true }) * 1000,
          minCandidateSpeechMs:
            this.config.get('EVAL_MIN_CANDIDATE_SPEECH_SEC', { infer: true }) * 1000,
        },
      },
      this.provider,
      { warn: (message) => this.logger.warn(`Assessment ${assessmentId}: ${message}`) },
    );

    const [report] = await this.prisma.$transaction([
      this.prisma.report.create({
        data: {
          assessmentId,
          json: result.report as unknown as Prisma.InputJsonValue,
          provider: result.provider,
          model: result.model,
          promptVersion: result.promptVersion,
        },
      }),
      this.prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: 'EVALUATED', evaluationError: null },
      }),
    ]);
    this.logger.log(
      `Assessment ${assessmentId}: evaluated (${result.report.status}, ${result.report.recommendation ?? '-'}) ` +
        `with ${result.provider}/${result.model}, ${result.promptVersion}, ${Date.now() - started} ms`,
    );
    return report;
  }
}
