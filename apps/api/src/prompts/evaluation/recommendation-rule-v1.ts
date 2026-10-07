/**
 * The recommendation rule as evaluation-v1 to -v4 describe it to the model (any criterion at
 * 1 meant NOT_READY, READY needed every criterion at 3+). Frozen here so those released
 * prompts keep their exact text; the rule in code changed with evaluation-v5.
 */
export const RECOMMENDATION_RULE_TEXT_V1 = [
  'NOT_READY: speaking or listening is two or more CEFR levels below the target level, or any criterion scores 1, or the average criterion score is below 2.5.',
  'READY: speaking and listening are both at or above the target level, every criterion scores at least 3 and the average is at least 3.5.',
  'READY_WITH_CONCERNS: everything in between.',
].join('\n');
