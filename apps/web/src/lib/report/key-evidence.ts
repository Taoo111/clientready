import type { CriterionResult, EvidenceKind, EvidenceQuote } from '@clientready/shared';

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
 * The first quote that shows a weakness or a strength. Reports before evaluation-v5 do not
 * mark their quotes, so there the first quote stands for both.
 */
function quoteOf(criterion: CriterionResult, wanted: EvidenceKind): EvidenceQuote | undefined {
  const marked = criterion.evidence.some((q) => q.kind);
  return marked ? criterion.evidence.find((q) => q.kind === wanted) : criterion.evidence[0];
}

/**
 * A weakness from the lowest- and a strength from the highest-scoring criterion, shown next
 * to the recommendation so the recruiter sees evidence before (not after) the AI's verdict.
 * Criteria without such a quote are skipped; equal scores keep the rubric order.
 */
export function keyEvidence(criteria: readonly CriterionResult[]): KeyEvidence[] {
  const byScore = [...criteria].sort((a, b) => a.score - b.score);
  const weakest = byScore.find((c) => quoteOf(c, 'weakness'));
  const strongest = byScore.findLast((c) => quoteOf(c, 'strength'));

  const pick = (
    kind: KeyEvidence['kind'],
    c: CriterionResult,
    quote: EvidenceQuote,
  ): KeyEvidence => ({
    kind,
    criterionKey: c.key,
    criterionName: c.name,
    score: c.score,
    quote: quote.quote,
    seq: quote.seq,
  });
  if (!weakest || !strongest) {
    if (weakest) return [pick('weakest', weakest, quoteOf(weakest, 'weakness')!)];
    if (strongest) return [pick('strongest', strongest, quoteOf(strongest, 'strength')!)];
    return [];
  }
  // One criterion, or all scored the same: a single quote, not called "strongest".
  if (weakest.score >= strongest.score) {
    return [pick('example', strongest, quoteOf(strongest, 'strength')!)];
  }
  return [
    pick('weakest', weakest, quoteOf(weakest, 'weakness')!),
    pick('strongest', strongest, quoteOf(strongest, 'strength')!),
  ];
}
