import type { CriterionResult } from '@clientready/shared';

export interface KeyEvidence {
  /** `example` when every criterion scored the same: neither weakest nor strongest. */
  kind: 'weakest' | 'strongest' | 'example';
  criterionKey: string;
  criterionName: string;
  score: number;
  quote: string;
  seq: number;
}

/**
 * One quote from the lowest- and one from the highest-scoring criterion, shown next to the
 * recommendation so the recruiter sees evidence before (not after) the AI's verdict.
 * Criteria without verified quotes are skipped; equal scores keep the rubric order.
 */
export function keyEvidence(criteria: readonly CriterionResult[]): KeyEvidence[] {
  const withQuotes = criteria.filter((c) => c.evidence.length > 0);
  if (withQuotes.length === 0) return [];
  const byScore = [...withQuotes].sort((a, b) => a.score - b.score);
  const weakest = byScore[0]!;
  const strongest = byScore.at(-1)!;

  const pick = (kind: KeyEvidence['kind'], c: CriterionResult): KeyEvidence => ({
    kind,
    criterionKey: c.key,
    criterionName: c.name,
    score: c.score,
    quote: c.evidence[0]!.quote,
    seq: c.evidence[0]!.seq,
  });
  // One criterion, or all scored the same: a single quote, not called "strongest".
  if (weakest === strongest || weakest.score === strongest.score) {
    return [pick('example', strongest)];
  }
  return [pick('weakest', weakest), pick('strongest', strongest)];
}
