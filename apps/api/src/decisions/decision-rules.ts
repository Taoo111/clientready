import {
  DECISION_COMMENT_MIN,
  type Recommendation,
  type RecruiterDecisionInput,
} from '@clientready/shared';

/** There is no AI recommendation to decide on (no report, insufficient data, data deleted). */
export class DecisionNotAllowedError extends Error {}

export class DecisionCommentRequiredError extends Error {
  constructor() {
    super(
      `A comment of at least ${DECISION_COMMENT_MIN} characters is required when the verdict differs from the AI recommendation`,
    );
  }
}

export interface DecisionValues {
  verdict: Recommendation;
  agreesWithAi: boolean;
  comment: string | null;
}

/** Checks a recruiter's verdict against the AI recommendation it responds to. */
export function decide(
  aiRecommendation: Recommendation | null,
  input: RecruiterDecisionInput,
): DecisionValues {
  if (!aiRecommendation) {
    throw new DecisionNotAllowedError('The report has no recommendation to decide on');
  }
  const agreesWithAi = input.verdict === aiRecommendation;
  const comment = input.comment?.trim() || null;
  if (!agreesWithAi && (comment?.length ?? 0) < DECISION_COMMENT_MIN) {
    throw new DecisionCommentRequiredError();
  }
  return { verdict: input.verdict, agreesWithAi, comment };
}
