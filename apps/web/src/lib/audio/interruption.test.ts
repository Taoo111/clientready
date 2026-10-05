import { describe, expect, it } from 'vitest';
import { interruptionCause, type AudioHealth } from './interruption';

const healthy: AudioHealth = { trackState: 'live', trackMuted: false, contextState: 'running' };

describe('interruptionCause', () => {
  it('is null while the microphone and the audio work', () => {
    expect(interruptionCause(healthy)).toBeNull();
    expect(interruptionCause({ ...healthy, contextState: undefined })).toBeNull();
  });

  it('detects a microphone taken away by another app (phone call)', () => {
    expect(interruptionCause({ ...healthy, trackState: 'ended' })).toBe('mic-ended');
    expect(interruptionCause({ ...healthy, trackState: undefined })).toBe('mic-ended');
    expect(interruptionCause({ ...healthy, trackMuted: true })).toBe('mic-muted');
  });

  it('detects suspended page audio, including Safari’s "interrupted"', () => {
    expect(interruptionCause({ ...healthy, contextState: 'suspended' })).toBe('audio-suspended');
    expect(interruptionCause({ ...healthy, contextState: 'interrupted' })).toBe('audio-suspended');
  });

  it('reports the microphone first when several things fail', () => {
    expect(
      interruptionCause({ trackState: 'ended', trackMuted: true, contextState: 'suspended' }),
    ).toBe('mic-ended');
  });
});
