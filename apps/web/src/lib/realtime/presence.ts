import { SPEAKING_THRESHOLD } from '../audio/level-meter';
import type { ConversationActivity } from './turn-tracker';

export type PresenceState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'you';

export interface PresenceInput {
  now: number;
  connecting: boolean;
  /** Loudness of the client's voice, 0..1. */
  aiLevel: number;
}

/** The client still counts as speaking this long after its voice went quiet (gaps between words). */
export const AI_SPEAKING_HOLD_MS = 900;
/** A state is shown at least this long, so the label does not flicker. */
export const MIN_STATE_MS = 600;
/** Stop showing "thinking" if no reply came (e.g. the speech detector reacted to noise). */
export const MAX_THINKING_MS = 8_000;

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
  /** Between the speech detector's start and stop of the candidate's turn. */
  private candidateSpeaking = false;
  /** The candidate has finished speaking and the client's reply has not started yet. */
  private thinkingSince: number | undefined;

  /** Turn-taking signals from the realtime events. */
  activity(activity: ConversationActivity, now: number): void {
    this.candidateSpeaking = activity === 'candidate-started';
    this.thinkingSince = activity === 'candidate-stopped' ? now : undefined;
  }

  /** Forgets the turn state (a new connection starts). */
  reset(): void {
    this.candidateSpeaking = false;
    this.thinkingSince = undefined;
  }

  update(input: PresenceInput): PresenceState {
    const aiLoud = input.aiLevel > SPEAKING_THRESHOLD;
    if (aiLoud) this.aiLoudAt = input.now;
    // "Thinking" ends when the client starts talking, or after a while.
    if (
      this.thinkingSince !== undefined &&
      (aiLoud || input.now - this.thinkingSince > MAX_THINKING_MS)
    ) {
      this.thinkingSince = undefined;
    }
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
    if (this.candidateSpeaking) return 'you';
    if (this.thinkingSince !== undefined) return 'thinking';
    return 'listening';
  }
}
