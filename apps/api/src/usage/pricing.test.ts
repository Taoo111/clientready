import { EMPTY_USAGE } from '@clientready/shared';
import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from './pricing';

describe('estimateCostUsd', () => {
  it('prices every realtime token kind separately', () => {
    const usage = {
      inputTextTokens: 1_000_000,
      inputAudioTokens: 1_000_000,
      cachedTextTokens: 1_000_000,
      cachedAudioTokens: 1_000_000,
      outputTextTokens: 1_000_000,
      outputAudioTokens: 1_000_000,
    };
    expect(estimateCostUsd('gpt-realtime-2.1', usage)).toBeCloseTo(4 + 32 + 0.4 + 0.4 + 24 + 64);
  });

  it('prices a typical evaluation', () => {
    expect(
      estimateCostUsd('gpt-6-sol', {
        ...EMPTY_USAGE,
        inputTextTokens: 6000,
        outputTextTokens: 8000,
      }),
    ).toBeCloseTo(0.012 + 0.08);
  });

  it('treats a dated snapshot like its alias', () => {
    const usage = { ...EMPTY_USAGE, outputAudioTokens: 1000 };
    expect(estimateCostUsd('gpt-realtime-2.1-mini-2026-08-28', usage)).toBe(
      estimateCostUsd('gpt-realtime-2.1-mini', usage),
    );
  });

  it('returns null for an unknown model', () => {
    expect(estimateCostUsd('fake-realtime', EMPTY_USAGE)).toBeNull();
  });
});
