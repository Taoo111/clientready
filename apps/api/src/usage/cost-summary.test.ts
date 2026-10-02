import { EMPTY_USAGE } from '@clientready/shared';
import { describe, expect, it } from 'vitest';
import { summariseCost, type UsageRow } from './cost-summary';

const row = (patch: Partial<UsageRow>): UsageRow => ({
  ...EMPTY_USAGE,
  source: 'REALTIME',
  model: 'gpt-realtime-2.1',
  ...patch,
});

describe('summariseCost', () => {
  it('adds up connections per source', () => {
    const summary = summariseCost([
      row({ outputAudioTokens: 1000 }),
      row({ outputAudioTokens: 1000 }),
      row({ source: 'EVALUATION', model: 'gpt-6-sol', outputTextTokens: 10_000 }),
    ]);
    expect(summary.bySource.REALTIME).toBeCloseTo(0.128);
    expect(summary.bySource.EVALUATION).toBeCloseTo(0.1);
    expect(summary.bySource.TRANSCRIPTION).toBe(0);
    expect(summary.totalUsd).toBeCloseTo(0.228);
    expect(summary.unpricedModels).toEqual([]);
  });

  it('lists models without a price instead of guessing', () => {
    const summary = summariseCost([row({ model: 'fake-realtime', outputAudioTokens: 1000 })]);
    expect(summary.totalUsd).toBe(0);
    expect(summary.unpricedModels).toEqual(['fake-realtime']);
  });
});
