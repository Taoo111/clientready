import type { CriterionResult } from '@clientready/shared';
import { describe, expect, it } from 'vitest';
import { keyEvidence } from './key-evidence';

function criterion(key: string, score: number, quotes: string[] = []): CriterionResult {
  return {
    key,
    name: key,
    score,
    comment: '',
    evidence: quotes.map((quote, i) => ({ quote, seq: i + 1 })),
    rejectedQuotes: 0,
  };
}

describe('keyEvidence', () => {
  it('takes the first quote of the weakest and the strongest criterion', () => {
    const result = keyEvidence([
      criterion('a', 3, ['a1']),
      criterion('b', 2, ['b1', 'b2']),
      criterion('c', 5, ['c1']),
    ]);
    expect(result.map((e) => [e.kind, e.criterionKey, e.quote])).toEqual([
      ['weakest', 'b', 'b1'],
      ['strongest', 'c', 'c1'],
    ]);
  });

  it('skips criteria without verified quotes', () => {
    const result = keyEvidence([criterion('a', 1), criterion('b', 4, ['b1'])]);
    expect(result).toEqual([expect.objectContaining({ kind: 'strongest', criterionKey: 'b' })]);
  });

  it('returns one quote when all scores are equal, none without quotes', () => {
    expect(keyEvidence([criterion('a', 3, ['a1']), criterion('b', 3, ['b1'])])).toHaveLength(1);
    expect(keyEvidence([criterion('a', 3)])).toEqual([]);
  });
});
