import type { Speaker } from '@clientready/shared';

/** A finished transcript turn, ready to be stored. */
export interface FinalTurn {
  speaker: Speaker;
  text: string;
  /** Epoch ms when the turn started. */
  startedAtEpochMs: number;
  /** Spoken duration, when speech start and stop were both observed. */
  durationMs?: number;
}

export type ConversationActivity = 'candidate-started' | 'candidate-stopped' | 'response-done';

export type ServerEvent = { type: string } & Record<string, unknown>;

export interface TurnTrackerHandlers {
  onTurn: (turn: FinalTurn) => void;
  onActivity?: (activity: ConversationActivity) => void;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Turns realtime server events into transcript turns with start times. Pure bookkeeping
 * (no WebRTC), so it can be unit-tested with recorded events.
 *
 * Candidate turns: speech_started/stopped give the timing, the transcription event the text.
 * AI turns: the first transcript delta gives the start, the transcript "done" event the text.
 */
export class TurnTracker {
  /** item_id -> epoch ms when the candidate started speaking. */
  private readonly speechStarts = new Map<string, number>();
  /** item_id -> epoch ms when the candidate stopped speaking. */
  private readonly speechStops = new Map<string, number>();
  /** response_id -> epoch ms when the AI started speaking. */
  private readonly responseStarts = new Map<string, number>();
  /** Guards against the GA and legacy "done" events both arriving for one transcript. */
  private readonly finishedResponses = new Set<string>();

  constructor(private readonly handlers: TurnTrackerHandlers) {}

  /** Returns false for events this tracker does not care about. */
  handle(event: ServerEvent, now: number): boolean {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.speechStarts.set(str(event.item_id), now);
        this.handlers.onActivity?.('candidate-started');
        return true;

      case 'input_audio_buffer.speech_stopped':
        this.speechStops.set(str(event.item_id), now);
        this.handlers.onActivity?.('candidate-stopped');
        return true;

      case 'conversation.item.input_audio_transcription.completed':
      case 'conversation.item.input_audio_transcription.failed':
        this.candidateTurnDone(event, now);
        return true;

      // GA name first; the legacy (beta) name is still present in some SDK typings.
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta': {
        const responseId = str(event.response_id);
        if (!this.responseStarts.has(responseId)) this.responseStarts.set(responseId, now);
        return true;
      }

      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        this.aiTurnDone(event, now);
        return true;

      default:
        return false;
    }
  }

  private candidateTurnDone(event: ServerEvent, now: number): void {
    const itemId = str(event.item_id);
    const text =
      event.type === 'conversation.item.input_audio_transcription.failed'
        ? '[inaudible]'
        : str(event.transcript).trim();
    const startedAt = this.speechStarts.get(itemId);
    const stoppedAt = this.speechStops.get(itemId);
    if (text) {
      this.handlers.onTurn({
        speaker: 'CANDIDATE',
        text,
        startedAtEpochMs: startedAt ?? now,
        durationMs:
          startedAt !== undefined && stoppedAt !== undefined ? stoppedAt - startedAt : undefined,
      });
    }
    this.speechStarts.delete(itemId);
    this.speechStops.delete(itemId);
  }

  private aiTurnDone(event: ServerEvent, now: number): void {
    const responseId = str(event.response_id);
    const key = `${responseId}:${str(event.item_id)}:${String(event.content_index ?? 0)}`;
    if (this.finishedResponses.has(key)) return;
    this.finishedResponses.add(key);
    const text = str(event.transcript).trim();
    if (text) {
      this.handlers.onTurn({
        speaker: 'AI',
        text,
        startedAtEpochMs: this.responseStarts.get(responseId) ?? now,
      });
    }
    this.responseStarts.delete(responseId);
  }
}
