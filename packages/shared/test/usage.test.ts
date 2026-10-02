import { describe, expect, it } from 'vitest';
import {
  addUsage,
  EMPTY_USAGE,
  TokenUsageSchema,
  usageFromRealtimeResponse,
  usageFromTranscription,
} from '../src/usage.js';

describe('usageFromRealtimeResponse', () => {
  it('splits cached tokens out of the input text and audio tokens', () => {
    expect(
      usageFromRealtimeResponse({
        input_tokens: 6200,
        input_token_details: {
          text_tokens: 5000,
          audio_tokens: 1200,
          cached_tokens: 5600,
          cached_tokens_details: { text_tokens: 4800, audio_tokens: 800 },
        },
        output_tokens: 330,
        output_token_details: { text_tokens: 60, audio_tokens: 270 },
      }),
    ).toEqual({
      inputTextTokens: 200,
      inputAudioTokens: 400,
      cachedTextTokens: 4800,
      cachedAudioTokens: 800,
      outputTextTokens: 60,
      outputAudioTokens: 270,
    });
  });

  it('treats missing or malformed fields as zero', () => {
    expect(usageFromRealtimeResponse(undefined)).toEqual(EMPTY_USAGE);
    expect(usageFromRealtimeResponse({ input_token_details: { text_tokens: 'x' } })).toEqual(
      EMPTY_USAGE,
    );
  });
});

describe('usageFromTranscription', () => {
  it('counts token-billed transcription', () => {
    expect(
      usageFromTranscription({
        type: 'tokens',
        input_tokens: 120,
        input_token_details: { audio_tokens: 110, text_tokens: 10 },
        output_tokens: 25,
        total_tokens: 145,
      }),
    ).toEqual({ ...EMPTY_USAGE, inputAudioTokens: 110, inputTextTokens: 10, outputTextTokens: 25 });
  });

  it('falls back to input_tokens as audio without details', () => {
    expect(usageFromTranscription({ type: 'tokens', input_tokens: 90, output_tokens: 5 })).toEqual({
      ...EMPTY_USAGE,
      inputAudioTokens: 90,
      outputTextTokens: 5,
    });
  });

  it('ignores duration-billed transcription', () => {
    expect(usageFromTranscription({ type: 'duration', seconds: 4.2 })).toEqual(EMPTY_USAGE);
  });
});

describe('addUsage', () => {
  it('adds field by field and the result stays valid', () => {
    const a = { ...EMPTY_USAGE, inputAudioTokens: 3, outputAudioTokens: 7 };
    const sum = addUsage(a, a);
    expect(sum).toEqual({ ...EMPTY_USAGE, inputAudioTokens: 6, outputAudioTokens: 14 });
    expect(TokenUsageSchema.safeParse(sum).success).toBe(true);
  });
});
