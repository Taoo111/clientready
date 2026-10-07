import { describe, expect, it } from 'vitest';
import { computeRecommendation } from './recommendation';

describe('computeRecommendation (target B2)', () => {
  const base = { targetLevel: 'B2' as const };

  it('READY when at target and all criteria solid', () => {
    expect(
      computeRecommendation({ ...base, speaking: 'B2', listening: 'C1', scores: [4, 4, 3, 4, 4] }),
    ).toBe('READY');
  });

  it('READY_WITH_CONCERNS when one level below target', () => {
    expect(
      computeRecommendation({ ...base, speaking: 'B1', listening: 'B2', scores: [4, 4, 3, 4, 4] }),
    ).toBe('READY_WITH_CONCERNS');
  });

  it('one weaker criterion alone does not block READY', () => {
    expect(
      computeRecommendation({ ...base, speaking: 'B2', listening: 'B2', scores: [4, 4, 4, 2, 4] }),
    ).toBe('READY');
  });

  it('READY_WITH_CONCERNS when two criteria are weak or one is at 1', () => {
    expect(
      computeRecommendation({ ...base, speaking: 'B2', listening: 'B2', scores: [4, 4, 2, 2, 5] }),
    ).toBe('READY_WITH_CONCERNS');
    expect(
      computeRecommendation({ ...base, speaking: 'B2', listening: 'B2', scores: [4, 4, 4, 1, 5] }),
    ).toBe('READY_WITH_CONCERNS');
  });

  it('NOT_READY when two levels below target', () => {
    expect(
      computeRecommendation({ ...base, speaking: 'A2', listening: 'B1', scores: [3, 3, 3, 3, 3] }),
    ).toBe('NOT_READY');
  });

  it('NOT_READY when two criteria are at 1 or the average is low', () => {
    expect(
      computeRecommendation({ ...base, speaking: 'B2', listening: 'B2', scores: [4, 4, 1, 1, 4] }),
    ).toBe('NOT_READY');
    expect(
      computeRecommendation({ ...base, speaking: 'B1', listening: 'B1', scores: [2, 2, 3, 2, 2] }),
    ).toBe('NOT_READY');
  });
});

describe('computeRecommendation depends on the target level', () => {
  const candidate = { speaking: 'B1' as const, listening: 'B1' as const, scores: [4, 3, 4, 3, 4] };

  it('the same B1 candidate is READY for a B1 role and not for C1', () => {
    expect(computeRecommendation({ ...candidate, targetLevel: 'B1' })).toBe('READY');
    expect(computeRecommendation({ ...candidate, targetLevel: 'B2' })).toBe('READY_WITH_CONCERNS');
    expect(computeRecommendation({ ...candidate, targetLevel: 'C1' })).toBe('NOT_READY');
  });
});
