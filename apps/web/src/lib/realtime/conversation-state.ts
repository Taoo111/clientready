import type { PresenceState } from './presence';

/** What the live conversation screen renders (owned by ConversationController). */

export type ConversationPhase =
  | 'connecting'
  | 'live'
  /** Another app (e.g. a phone call) took the microphone or the audio; waiting for a click. */
  | 'interrupted'
  | 'dropped'
  | 'finishing'
  | 'ended';
export type ConversationError =
  'tooManyConnections' | 'unavailable' | 'connectFailed' | 'micUnavailable';
export type UploadStatus = 'idle' | 'uploading' | 'done' | 'failed';

export interface ConversationState {
  phase: ConversationPhase;
  /** Set while `dropped` / `interrupted` when reconnecting or resuming failed. */
  error?: ConversationError;
  /** Reconnecting makes sense (false e.g. after too many connections). */
  canReconnect: boolean;
  remainingMs: number;
  micLevel: number;
  aiLevel: number;
  /** Who is talking, smoothed for the label on the screen. */
  presence: PresenceState;
  endReason?: 'candidate' | 'timeUp';
  upload: UploadStatus;
}
