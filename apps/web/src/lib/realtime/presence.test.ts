import { describe, expect, it } from 'vitest';
import {
  AI_SPEAKING_HOLD_MS,
  MAX_THINKING_MS,
  MIN_STATE_MS,
  PresenceSmoother,
  type PresenceInput,
} from './presence';

function run(smoother: PresenceSmoother, now: number, patch: Partial<PresenceInput> = {}) {
  return smoother.update({ connecting: false, aiLevel: 0, now, ...patch });
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
    smoother.activity('candidate-started', 1_000);
    expect(run(smoother, 1_000)).toBe('you');
    // The detector flips quickly: the label does not.
    smoother.activity('response-done', 1_100);
    expect(run(smoother, 1_100)).toBe('you');
    expect(run(smoother, 1_000 + MIN_STATE_MS)).toBe('listening');
  });

  it('shows thinking between the candidate’s turn and the reply', () => {
    const smoother = new PresenceSmoother();
    run(smoother, 0);
    smoother.activity('candidate-stopped', 1_000);
    expect(run(smoother, 1_000)).toBe('thinking');
    expect(run(smoother, 2_000, { aiLevel: 0.4 })).toBe('speaking');
  });

  it('stops thinking when no reply comes, and after a reset', () => {
    const smoother = new PresenceSmoother();
    run(smoother, 0);
    smoother.activity('candidate-stopped', 1_000);
    expect(run(smoother, 1_000)).toBe('thinking');
    expect(run(smoother, 1_000 + MAX_THINKING_MS + 1)).toBe('listening');

    smoother.activity('candidate-started', 20_000);
    smoother.reset();
    expect(run(smoother, 20_000)).toBe('listening');
  });

  it('prefers the client’s voice over the candidate’s detector', () => {
    const smoother = new PresenceSmoother();
    run(smoother, 0);
    smoother.activity('candidate-started', 1_000);
    expect(run(smoother, 1_000, { aiLevel: 0.4 })).toBe('speaking');
  });
});
