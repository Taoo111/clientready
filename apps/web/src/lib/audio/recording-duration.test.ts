import { describe, expect, it } from 'vitest';
import { fixUnknownDuration } from './recording-duration';

class FakeAudio extends EventTarget {
  duration = NaN;
  currentTime = 0;
  readyState = 0;
}

describe('fixUnknownDuration', () => {
  it('finds the real duration of a recording without one, then goes back to the start', () => {
    const audio = new FakeAudio();
    fixUnknownDuration(audio);

    audio.duration = Infinity;
    audio.readyState = 1;
    audio.dispatchEvent(new Event('loadedmetadata'));
    expect(audio.currentTime).toBeGreaterThan(1e100);

    audio.dispatchEvent(new Event('durationchange')); // still unknown
    expect(audio.currentTime).toBeGreaterThan(1e100);

    audio.duration = 487.2;
    audio.dispatchEvent(new Event('durationchange'));
    expect(audio.currentTime).toBe(0);
  });

  it('leaves recordings with a known duration alone, also when metadata is already loaded', () => {
    const audio = new FakeAudio();
    audio.duration = 120;
    audio.readyState = 1;
    fixUnknownDuration(audio);
    audio.dispatchEvent(new Event('loadedmetadata'));
    expect(audio.currentTime).toBe(0);
  });

  it('stops listening after cleanup', () => {
    const audio = new FakeAudio();
    fixUnknownDuration(audio)();
    audio.duration = Infinity;
    audio.dispatchEvent(new Event('loadedmetadata'));
    expect(audio.currentTime).toBe(0);
  });
});
