import { describe, expect, it } from 'vitest';
import { TurnTracker, type ConversationActivity, type FinalTurn } from './turn-tracker';

function setup() {
  const turns: FinalTurn[] = [];
  const activity: ConversationActivity[] = [];
  const tracker = new TurnTracker({
    onTurn: (turn) => turns.push(turn),
    onActivity: (a) => activity.push(a),
  });
  return { tracker, turns, activity };
}

describe('TurnTracker', () => {
  it('builds a candidate turn with start time and duration from the speech events', () => {
    const { tracker, turns, activity } = setup();
    tracker.handle({ type: 'input_audio_buffer.speech_started', item_id: 'i1' }, 1_000);
    tracker.handle({ type: 'input_audio_buffer.speech_stopped', item_id: 'i1' }, 4_500);
    tracker.handle(
      {
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'i1',
        transcript: '  I worked on payments.  ',
      },
      5_000,
    );
    expect(turns).toEqual([
      {
        speaker: 'CANDIDATE',
        text: 'I worked on payments.',
        startedAtEpochMs: 1_000,
        durationMs: 3_500,
      },
    ]);
    expect(activity).toEqual(['candidate-started', 'candidate-stopped']);
  });

  it('stores a failed transcription as [inaudible]', () => {
    const { tracker, turns } = setup();
    tracker.handle(
      { type: 'conversation.item.input_audio_transcription.failed', item_id: 'i2' },
      7_000,
    );
    expect(turns).toEqual([
      { speaker: 'CANDIDATE', text: '[inaudible]', startedAtEpochMs: 7_000, durationMs: undefined },
    ]);
  });

  it('times an AI turn from its first transcript delta and ignores a duplicate done event', () => {
    const { tracker, turns } = setup();
    tracker.handle({ type: 'response.output_audio_transcript.delta', response_id: 'r1' }, 2_000);
    tracker.handle({ type: 'response.output_audio_transcript.delta', response_id: 'r1' }, 2_400);
    const done = { response_id: 'r1', item_id: 'a1', transcript: 'Tell me about it.' };
    tracker.handle({ type: 'response.output_audio_transcript.done', ...done }, 3_000);
    tracker.handle({ type: 'response.audio_transcript.done', ...done }, 3_001);
    expect(turns).toEqual([{ speaker: 'AI', text: 'Tell me about it.', startedAtEpochMs: 2_000 }]);
  });

  it('skips empty transcripts and reports unrelated events as unhandled', () => {
    const { tracker, turns } = setup();
    tracker.handle(
      {
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'i3',
        transcript: '   ',
      },
      1_000,
    );
    expect(turns).toEqual([]);
    expect(tracker.handle({ type: 'response.done' }, 1_000)).toBe(false);
  });
});
