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
    expect(result).toEqual([expect.objectContaining({ kind: 'example', criterionKey: 'b' })]);
  });

  it('returns one quote when all scores are equal, none without quotes', () => {
    const equal = keyEvidence([criterion('a', 3, ['a1']), criterion('b', 3, ['b1'])]);
    expect(equal.map((e) => e.kind)).toEqual(['example']);
    expect(keyEvidence([criterion('a', 3)])).toEqual([]);
  });

  describe('with quotes marked as strengths and weaknesses (evaluation-v5)', () => {
    const marked = (
      key: string,
      score: number,
      quotes: [string, 'strength' | 'weakness'][],
    ): CriterionResult => ({
      ...criterion(key, score),
      evidence: quotes.map(([quote, kind], i) => ({ quote, seq: i + 1, kind })),
    });

    it('shows a weakness of the weakest and a strength of the strongest criterion', () => {
      const result = keyEvidence([
        marked('a', 2, [
          ['a-good', 'strength'],
          ['a-bad', 'weakness'],
        ]),
        marked('b', 4, [
          ['b-bad', 'weakness'],
          ['b-good', 'strength'],
        ]),
      ]);
      expect(result.map((e) => [e.kind, e.criterionKey, e.quote])).toEqual([
        ['weakest', 'a', 'a-bad'],
        ['strongest', 'b', 'b-good'],
      ]);
    });

    it('never shows a weakness as the strongest point', () => {
      const result = keyEvidence([
        marked('a', 1, [['a-bad', 'weakness']]),
        marked('b', 2, [['b-bad', 'weakness']]),
        marked('c', 2, [['c-good', 'strength']]),
      ]);
      expect(result.map((e) => [e.kind, e.quote])).toEqual([
        ['weakest', 'a-bad'],
        ['strongest', 'c-good'],
      ]);
      expect(keyEvidence([marked('a', 1, [['a-bad', 'weakness']])])).toEqual([
        expect.objectContaining({ kind: 'weakest', quote: 'a-bad' }),
      ]);
    });
  });
});
