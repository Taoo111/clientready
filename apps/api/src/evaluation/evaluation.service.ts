import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRoleTemplate } from '@clientready/shared';
import { isFinished } from '../assessments/assessment-rules';
import type { Env } from '../config/env';
import type { Prisma, Report } from '../generated/prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { evaluateConversation } from './evaluate';
import { EvaluationProvider } from './providers/provider';

/** The assessment cannot be evaluated (missing, deleted, wrong status); retrying won't help. */
export class EvaluationNotPossibleError extends Error {}
export class AssessmentNotFoundError extends EvaluationNotPossibleError {
  constructor() {
    super('Assessment not found');
  }
}

/** Evaluates one finished assessment and stores the report. No queueing or retries here. */
@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly provider: EvaluationProvider,
  ) {}

  /** Adds a new report (older ones are kept) and marks the assessment EVALUATED. */
  async evaluateAndStore(assessmentId: string): Promise<Report> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { turns: true },
    });
    if (!assessment) throw new AssessmentNotFoundError();
    if (assessment.dataDeletedAt) {
      throw new EvaluationNotPossibleError('Candidate data was deleted');
    }
    if (!isFinished(assessment.status)) {
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

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.report.create({
        data: {
          assessmentId,
          json: result.report as unknown as Prisma.InputJsonValue,
          provider: result.provider,
          model: result.model,
          promptVersion: result.promptVersion,
        },
      });
      await tx.assessment.update({
        where: { id: assessmentId },
        data: { status: 'EVALUATED', evaluationError: null },
      });
      if (result.usage) {
        await tx.usageRecord.create({
          data: {
            assessmentId,
            source: 'EVALUATION',
            model: result.model,
            ref: created.id,
            ...result.usage,
          },
        });
      }
      return created;
    });
    this.logger.log(
      `Assessment ${assessmentId}: evaluated (${result.report.status}, ${result.report.recommendation ?? '-'}) ` +
        `with ${result.provider}/${result.model}, ${result.promptVersion}, ${Date.now() - started} ms`,
    );
    return report;
  }
}
