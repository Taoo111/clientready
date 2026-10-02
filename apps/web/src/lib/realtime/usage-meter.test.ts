import { EMPTY_USAGE } from '@clientready/shared';
import { describe, expect, it } from 'vitest';
import { UsageMeter } from './usage-meter';

const responseDone = (audioOut: number) => ({
  type: 'response.done',
  response: {
    status: 'completed',
    usage: {
      input_token_details: {
        text_tokens: 5000,
        audio_tokens: 400,
        cached_tokens_details: { text_tokens: 4500, audio_tokens: 100 },
      },
      output_token_details: { text_tokens: 20, audio_tokens: audioOut },
    },
  },
});

describe('UsageMeter', () => {
  it('sums the usage of every finished response', () => {
    const meter = new UsageMeter();
    expect(meter.handle(responseDone(200))).toBe(true);
    expect(meter.handle(responseDone(300))).toBe(true);
    expect(meter.totals().realtime).toEqual({
      inputTextTokens: 1000,
      inputAudioTokens: 600,
      cachedTextTokens: 9000,
      cachedAudioTokens: 200,
      outputTextTokens: 40,
      outputAudioTokens: 500,
    });
    expect(meter.totals().transcription).toEqual(EMPTY_USAGE);
  });

  it('sums token-billed transcriptions separately', () => {
    const meter = new UsageMeter();
    const event = {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'i1',
      transcript: 'Hello',
      usage: { type: 'tokens', input_tokens: 50, output_tokens: 4, total_tokens: 54 },
    };
    meter.handle(event);
    meter.handle(event);
    expect(meter.totals().transcription).toEqual({
      ...EMPTY_USAGE,
      inputAudioTokens: 100,
      outputTextTokens: 8,
    });
  });

  it('ignores events without usage', () => {
    const meter = new UsageMeter();
    expect(meter.handle({ type: 'response.done', response: { status: 'cancelled' } })).toBe(false);
    expect(meter.handle({ type: 'input_audio_buffer.speech_started' })).toBe(false);
    expect(meter.totals().realtime).toEqual(EMPTY_USAGE);
  });
});
