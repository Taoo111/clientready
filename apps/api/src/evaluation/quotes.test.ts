import { describe, expect, it } from 'vitest';
import { findQuote, normalizeForMatch, verifyQuotes } from './quotes';
import type { EvalTurn } from './transcript';

const turns: EvalTurn[] = [
  { seq: 0, speaker: 'AI', text: 'Why did you choose Kafka?', startedAtMs: 0, durationMs: null },
  {
    seq: 1,
    speaker: 'CANDIDATE',
    text: 'We chose Kafka, because we needed replay — and honestly, the team already knew it.',
    startedAtMs: 3_000,
    durationMs: 6_000,
  },
  {
    seq: 2,
    speaker: 'CANDIDATE',
    text: "I don't know exactly, maybe three weeks.",
    startedAtMs: 20_000,
    durationMs: 3_000,
  },
];

describe('normalizeForMatch', () => {
  it('ignores case, punctuation, typographic apostrophes and whitespace', () => {
    expect(normalizeForMatch('  I DON’T   know — exactly! ')).toBe('i dont know exactly');
    expect(normalizeForMatch("I don't know exactly")).toBe('i dont know exactly');
  });
});

describe('findQuote', () => {
  const candidateTurns = turns.filter((t) => t.speaker === 'CANDIDATE');

  it('matches after normalisation', () => {
    expect(
      findQuote({ quote: 'we chose kafka because we needed replay' }, candidateTurns)?.seq,
    ).toBe(1);
    expect(findQuote({ quote: 'I don’t know exactly' }, candidateTurns)?.seq).toBe(2);
  });

  it('matches ellipsis fragments in order within one turn', () => {
    expect(
      findQuote({ quote: 'We chose Kafka... the team already knew it' }, candidateTurns)?.seq,
    ).toBe(1);
    expect(findQuote({ quote: 'the team already knew it … We chose Kafka' }, candidateTurns)).toBe(
      undefined,
    );
  });

  it('does not match across turns, partial words or paraphrases', () => {
    expect(findQuote({ quote: 'knew it. I don’t know' }, candidateTurns)).toBeUndefined();
    expect(findQuote({ quote: 'chose Kaf' }, candidateTurns)).toBeUndefined();
    expect(findQuote({ quote: 'we picked Kafka for replay' }, candidateTurns)).toBeUndefined();
  });

  it('finds the quote even with a wrong turn hint', () => {
    expect(findQuote({ quote: 'maybe three weeks', seq: 1 }, candidateTurns)?.seq).toBe(2);
  });
});

describe('verifyQuotes', () => {
  it('rejects quotes from the AI and invented quotes, keeps real ones with their seq', () => {
    const result = verifyQuotes(
      [
        { quote: 'Why did you choose Kafka?', seq: 0 },
        { quote: 'I have deep expertise in Kafka', seq: 1 },
        { quote: 'maybe three weeks', seq: 2 },
      ],
      turns,
    );
    expect(result.accepted).toEqual([{ quote: 'maybe three weeks', seq: 2 }]);
    expect(result.rejected).toHaveLength(2);
  });

  it('de-duplicates and caps at the limit', () => {
    const result = verifyQuotes(
      [
        { quote: 'maybe three weeks' },
        { quote: 'Maybe three weeks.' },
        { quote: 'we needed replay' },
        { quote: 'the team already knew it' },
        { quote: 'I don’t know exactly' },
      ],
      turns,
    );
    expect(result.accepted.map((q) => q.quote)).toEqual([
      'maybe three weeks',
      'we needed replay',
      'the team already knew it',
    ]);
  });

  it('keeps whether a quote is a strength or a weakness', () => {
    const result = verifyQuotes(
      [
        { quote: 'we needed replay', seq: 1, kind: 'strength' },
        { quote: 'maybe three weeks', seq: 2, kind: 'weakness' },
      ],
      turns,
    );
    expect(result.accepted).toEqual([
      { quote: 'we needed replay', seq: 1, kind: 'strength' },
      { quote: 'maybe three weeks', seq: 2, kind: 'weakness' },
    ]);
  });
});
