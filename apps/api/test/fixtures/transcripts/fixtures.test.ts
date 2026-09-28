import { describe, expect, it } from 'vitest';
import { computeStats, insufficientDataReason } from '../../../src/evaluation/transcript';
import { transcriptFixtures } from './index';

const thresholds = { minConversationMs: 420_000, minCandidateSpeechMs: 180_000 };

describe('transcript fixtures', () => {
  it.each(transcriptFixtures.map((f) => [f.name, f] as const))(
    '%s is long enough to be scored',
    (_name, fixture) => {
      const stats = computeStats(fixture.turns, fixture.conversationMs);
      expect(insufficientDataReason(stats, thresholds)).toBeNull();
      expect(stats.candidateSpeechMs).toBeGreaterThan(190_000);
    },
  );
});
