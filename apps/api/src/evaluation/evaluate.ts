import {
  ReportSchema,
  type CriterionResult,
  type Report,
  type RoleTemplate,
  type TargetLevel,
} from '@clientready/shared';
import {
  buildEvaluationOutputSchema,
  buildEvaluationSystemPrompt,
  buildEvaluationUserMessage,
  EVALUATION_PROMPT_VERSION,
} from '../prompts/evaluation/v2';
import { EvaluationProvider, EvaluationProviderError } from './provider';
import { verifyQuotes } from './quotes';
import { computeRecommendation } from './recommendation';
import {
  computeStats,
  insufficientDataReason,
  sortTurns,
  type EvalTurn,
  type SufficiencyThresholds,
} from './transcript';

export interface EvaluationInput {
  template: RoleTemplate;
  targetLevel: TargetLevel;
  turns: readonly EvalTurn[];
  conversationMs: number;
  thresholds: SufficiencyThresholds;
}

export interface EvaluationResult {
  report: Report;
  /** 'rules' when no model was called (insufficient data). */
  provider: string;
  model: string;
  promptVersion: string;
}

export interface EvaluationLogger {
  warn(message: string): void;
}

/**
 * Evaluates one conversation. Pure orchestration: no database access, the provider is
 * injected, so the same code runs in the job, the admin re-run and the fixture tests.
 */
export async function evaluateConversation(
  input: EvaluationInput,
  provider: EvaluationProvider,
  logger: EvaluationLogger = console,
): Promise<EvaluationResult> {
  const turns = sortTurns(input.turns);
  const stats = computeStats(turns, input.conversationMs);
  const base = {
    targetLevel: input.targetLevel,
    stats,
  };

  const tooLittle = insufficientDataReason(stats, input.thresholds);
  if (tooLittle) {
    return {
      report: ReportSchema.parse({
        ...base,
        status: 'INSUFFICIENT_DATA',
        insufficientReason: tooLittle,
        recommendation: null,
        modelRecommendation: null,
        summary: tooLittle,
        cefr: null,
        criteria: [],
        language: { nonEnglishDetected: false, notes: null },
      }),
      provider: 'rules',
      model: 'none',
      promptVersion: EVALUATION_PROMPT_VERSION,
    };
  }

  const schema = buildEvaluationOutputSchema(input.template);
  const output = await provider.generate({
    system: buildEvaluationSystemPrompt(input.template),
    user: buildEvaluationUserMessage({
      targetLevel: input.targetLevel,
      conversationMs: input.conversationMs,
      turns,
    }),
    schema,
    schemaName: 'client_readiness_evaluation',
  });
  const meta = {
    provider: provider.provider,
    model: provider.model,
    promptVersion: EVALUATION_PROMPT_VERSION,
  };
  const language = {
    nonEnglishDetected: output.languageUse.nonEnglishUsed,
    notes: output.languageUse.notes.trim() || null,
  };

  if (!output.sufficientEvidence) {
    const reason =
      output.insufficientReason.trim() || 'Model oceniający uznał, że danych jest za mało.';
    return {
      ...meta,
      report: ReportSchema.parse({
        ...base,
        status: 'INSUFFICIENT_DATA',
        insufficientReason: reason,
        recommendation: null,
        modelRecommendation: null,
        summary: reason,
        cefr: null,
        criteria: [],
        language,
      }),
    };
  }

  const criteria: CriterionResult[] = input.template.rubric.map((criterion) => {
    const result = output.criteria.find((c) => c.key === criterion.key);
    if (!result) {
      throw new EvaluationProviderError(`Missing criterion in output: ${criterion.key}`, true);
    }
    const { accepted, rejected } = verifyQuotes(result.evidence, turns);
    for (const quote of rejected) {
      logger.warn(
        `Rejected quote for ${criterion.key} (not found in candidate turns, seq=${quote.seq ?? '?'}): "${quote.quote}"`,
      );
    }
    return {
      key: criterion.key,
      name: criterion.name,
      score: Math.min(5, Math.max(1, Math.round(result.score))),
      comment: result.comment,
      evidence: accepted,
      rejectedQuotes: rejected.length,
    };
  });

  const recommendation = computeRecommendation({
    targetLevel: input.targetLevel,
    speaking: output.cefr.speaking.level,
    listening: output.cefr.listening.level,
    scores: criteria.map((c) => c.score),
  });
  if (recommendation !== output.recommendation) {
    logger.warn(
      `Model recommendation ${output.recommendation} differs from rule-based ${recommendation}; using the rule.`,
    );
  }

  return {
    ...meta,
    report: ReportSchema.parse({
      ...base,
      status: 'OK',
      insufficientReason: null,
      recommendation,
      modelRecommendation: output.recommendation,
      summary: output.summary,
      cefr: output.cefr,
      criteria,
      language,
    }),
  };
}
