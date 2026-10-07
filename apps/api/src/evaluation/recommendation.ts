import {
  cefrRank,
  type CefrLevel,
  type Recommendation,
  type TargetLevel,
} from '@clientready/shared';

export interface RecommendationInput {
  targetLevel: TargetLevel;
  speaking: CefrLevel;
  listening: CefrLevel;
  scores: readonly number[];
}

/**
 * Deterministic recommendation relative to the assessment's target level, so the same
 * scores always give the same outcome (the model's own suggestion is kept separately).
 * The English (CEFR) weighs most; no single criterion decides the outcome on its own
 * (since evaluation-v5: before, one criterion at 1 meant NOT_READY and one at 2 blocked
 * READY).
 *
 * - NOT_READY: speaking or listening two or more levels below target, two or more criteria
 *   at 1, or average score below 2.5.
 * - READY: speaking and listening at or above target, average at least 3.5, no criterion
 *   at 1 and at most one below 3.
 * - READY_WITH_CONCERNS: everything in between.
 */
export function computeRecommendation(input: RecommendationInput): Recommendation {
  const target = cefrRank(input.targetLevel);
  const speaking = cefrRank(input.speaking);
  const listening = cefrRank(input.listening);
  const avg = input.scores.reduce((sum, s) => sum + s, 0) / input.scores.length;
  const atOne = input.scores.filter((s) => s <= 1).length;
  const belowThree = input.scores.filter((s) => s < 3).length;

  if (speaking < target - 1 || listening < target - 1 || atOne >= 2 || avg < 2.5) {
    return 'NOT_READY';
  }
  if (speaking >= target && listening >= target && avg >= 3.5 && atOne === 0 && belowThree <= 1) {
    return 'READY';
  }
  return 'READY_WITH_CONCERNS';
}

/** The same rule in words, for the evaluation prompt. */
export const RECOMMENDATION_RULE_TEXT = [
  'NOT_READY: speaking or listening is two or more CEFR levels below the target level, or two or more criteria score 1, or the average criterion score is below 2.5.',
  'READY: speaking and listening are both at or above the target level, the average is at least 3.5, no criterion scores 1 and at most one criterion scores below 3.',
  'READY_WITH_CONCERNS: everything in between.',
].join('\n');
