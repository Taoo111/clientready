export type InterruptionCause = 'mic-ended' | 'mic-muted' | 'audio-suspended';

export interface AudioHealth {
  /** Undefined when the stream has no audio track at all. */
  trackState: MediaStreamTrackState | undefined;
  trackMuted: boolean;
  /** Safari reports 'interrupted' (e.g. during a phone call), which is not in the DOM typings. */
  contextState: AudioContextState | 'interrupted' | undefined;
}

/**
 * What, if anything, stops the call's audio. On a phone an incoming call takes the
 * microphone (the track is muted or ended) and suspends the page's audio, while the WebRTC
 * connection itself stays up - so nothing else would notice.
 */
export function interruptionCause(health: AudioHealth): InterruptionCause | null {
  if (health.trackState !== 'live') return 'mic-ended';
  if (health.trackMuted) return 'mic-muted';
  if (health.contextState === 'suspended' || health.contextState === 'interrupted') {
    return 'audio-suspended';
  }
  return null;
}

/** A muted microphone or suspended audio must last this long to count (brief glitches do not). */
const GRACE_MS = 1_500;

/**
 * Watches the microphone track, the AudioContext and page visibility, and reports an
 * interruption once (until `watch` is called again, e.g. with a new microphone).
 */
export class InterruptionWatcher {
  private cleanup: (() => void) | undefined;
  private graceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly onInterrupted: (cause: InterruptionCause) => void) {}

  watch(mic: MediaStream, context: AudioContext | undefined): void {
    this.stop();
    const track = mic.getAudioTracks()[0];
    const health = (): AudioHealth => ({
      trackState: track?.readyState,
      trackMuted: track?.muted ?? false,
      contextState: context?.state as AudioHealth['contextState'],
    });
    const check = () => {
      const cause = interruptionCause(health());
      clearTimeout(this.graceTimer);
      if (!cause) return;
      if (cause === 'mic-ended') return this.report(cause);
      this.graceTimer = setTimeout(() => {
        const still = interruptionCause(health());
        if (still) this.report(still);
      }, GRACE_MS);
    };

    track?.addEventListener('ended', check);
    track?.addEventListener('mute', check);
    track?.addEventListener('unmute', check);
    context?.addEventListener('statechange', check);
    document.addEventListener('visibilitychange', check);
    this.cleanup = () => {
      track?.removeEventListener('ended', check);
      track?.removeEventListener('mute', check);
      track?.removeEventListener('unmute', check);
      context?.removeEventListener('statechange', check);
      document.removeEventListener('visibilitychange', check);
    };
    check();
  }

  stop(): void {
    clearTimeout(this.graceTimer);
    this.cleanup?.();
    this.cleanup = undefined;
  }

  private report(cause: InterruptionCause): void {
    this.stop();
    this.onInterrupted(cause);
  }
}
