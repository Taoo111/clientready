import { SPEAKING_THRESHOLD } from '../audio/level-meter';

export type PresenceState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'you';

export interface PresenceInput {
  now: number;
  connecting: boolean;
  /** Loudness of the client's voice, 0..1. */
  aiLevel: number;
  /** The speech detector says the candidate is talking (stable over a whole turn). */
  candidateSpeaking: boolean;
  aiThinking: boolean;
}

/** The client still counts as speaking this long after its voice went quiet (gaps between words). */
export const AI_SPEAKING_HOLD_MS = 900;
/** A state is shown at least this long, so the label does not flicker. */
export const MIN_STATE_MS = 600;

/**
 * Who is talking, for the label on the conversation screen. Raw loudness changes many times
 * a second (pauses between words, breaths), which made the label flicker: the client's voice
 * is held across short gaps, the candidate's state comes from the speech detector, and every
 * state stays on screen for a minimum time.
 */
export class PresenceSmoother {
  private state: PresenceState = 'connecting';
  private since = Number.NEGATIVE_INFINITY;
  private aiLoudAt = Number.NEGATIVE_INFINITY;

  update(input: PresenceInput): PresenceState {
    if (input.aiLevel > SPEAKING_THRESHOLD) this.aiLoudAt = input.now;
    const next = this.target(input);
    if (next !== this.state && (input.connecting || input.now - this.since >= MIN_STATE_MS)) {
      this.state = next;
      this.since = input.now;
    }
    return this.state;
  }

  private target(input: PresenceInput): PresenceState {
    if (input.connecting) return 'connecting';
    if (input.now - this.aiLoudAt < AI_SPEAKING_HOLD_MS) return 'speaking';
    if (input.candidateSpeaking) return 'you';
    if (input.aiThinking) return 'thinking';
    return 'listening';
  }
}
