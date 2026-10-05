import { describe, expect, it } from 'vitest';
import {
  AI_SPEAKING_HOLD_MS,
  MIN_STATE_MS,
  PresenceSmoother,
  type PresenceInput,
} from './presence';

const quiet: Omit<PresenceInput, 'now'> = {
  connecting: false,
  aiLevel: 0,
  candidateSpeaking: false,
  aiThinking: false,
};

function run(smoother: PresenceSmoother, now: number, patch: Partial<PresenceInput> = {}) {
  return smoother.update({ ...quiet, now, ...patch });
}

describe('PresenceSmoother', () => {
  it('starts as connecting and switches to listening once connected', () => {
    const smoother = new PresenceSmoother();
    expect(run(smoother, 0, { connecting: true })).toBe('connecting');
    expect(run(smoother, 100)).toBe('listening');
  });

  it('keeps "speaking" through short pauses between the client’s words', () => {
    const smoother = new PresenceSmoother();
    run(smoother, 0);
    expect(run(smoother, 1_000, { aiLevel: 0.5 })).toBe('speaking');
    expect(run(smoother, 1_300)).toBe('speaking');
    expect(run(smoother, 1_000 + AI_SPEAKING_HOLD_MS - 1)).toBe('speaking');
    expect(run(smoother, 1_000 + AI_SPEAKING_HOLD_MS + MIN_STATE_MS)).toBe('listening');
  });

  it('shows every state for a minimum time', () => {
    const smoother = new PresenceSmoother();
    run(smoother, 0);
    expect(run(smoother, 1_000, { candidateSpeaking: true })).toBe('you');
    // The detector flips quickly: the label does not.
    expect(run(smoother, 1_100)).toBe('you');
    expect(run(smoother, 1_000 + MIN_STATE_MS)).toBe('listening');
  });

  it('shows thinking between the candidate’s turn and the reply', () => {
    const smoother = new PresenceSmoother();
    run(smoother, 0);
    expect(run(smoother, 1_000, { aiThinking: true })).toBe('thinking');
    expect(run(smoother, 2_000, { aiThinking: true, aiLevel: 0.4 })).toBe('speaking');
  });

  it('prefers the client’s voice over the candidate’s detector', () => {
    const smoother = new PresenceSmoother();
    run(smoother, 0);
    expect(run(smoother, 1_000, { aiLevel: 0.4, candidateSpeaking: true })).toBe('speaking');
  });
});
