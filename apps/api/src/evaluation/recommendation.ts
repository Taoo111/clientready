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
 *
 * - NOT_READY: speaking or listening two or more levels below target, any criterion at 1,
 *   or average score below 2.5.
 * - READY: speaking and listening at or above target, every criterion at least 3 and
 *   average at least 3.5.
 * - READY_WITH_CONCERNS: everything in between.
 */
export function computeRecommendation(input: RecommendationInput): Recommendation {
  const target = cefrRank(input.targetLevel);
  const speaking = cefrRank(input.speaking);
  const listening = cefrRank(input.listening);
  const min = Math.min(...input.scores);
  const avg = input.scores.reduce((sum, s) => sum + s, 0) / input.scores.length;

  if (speaking < target - 1 || listening < target - 1 || min <= 1 || avg < 2.5) {
    return 'NOT_READY';
  }
  if (speaking >= target && listening >= target && min >= 3 && avg >= 3.5) {
    return 'READY';
  }
  return 'READY_WITH_CONCERNS';
}

/** The same rule in words, for the evaluation prompt. */
export const RECOMMENDATION_RULE_TEXT = [
  'NOT_READY: speaking or listening is two or more CEFR levels below the target level, or any criterion scores 1, or the average criterion score is below 2.5.',
  'READY: speaking and listening are both at or above the target level, every criterion scores at least 3 and the average is at least 3.5.',
  'READY_WITH_CONCERNS: everything in between.',
].join('\n');
