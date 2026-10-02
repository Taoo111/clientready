import { z } from 'zod';

const tokenCount = z.number().int().nonnegative().max(100_000_000);

/**
 * Tokens billed for one source (a realtime connection, its transcription or an evaluation).
 * Cached tokens are counted separately from (not inside) the uncached input, because they
 * are priced differently.
 */
export const TokenUsageSchema = z.object({
  inputTextTokens: tokenCount,
  inputAudioTokens: tokenCount,
  cachedTextTokens: tokenCount,
  cachedAudioTokens: tokenCount,
  outputTextTokens: tokenCount,
  outputAudioTokens: tokenCount,
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const EMPTY_USAGE: TokenUsage = {
  inputTextTokens: 0,
  inputAudioTokens: 0,
  cachedTextTokens: 0,
  cachedAudioTokens: 0,
  outputTextTokens: 0,
  outputAudioTokens: 0,
};

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTextTokens: a.inputTextTokens + b.inputTextTokens,
    inputAudioTokens: a.inputAudioTokens + b.inputAudioTokens,
    cachedTextTokens: a.cachedTextTokens + b.cachedTextTokens,
    cachedAudioTokens: a.cachedAudioTokens + b.cachedAudioTokens,
    outputTextTokens: a.outputTextTokens + b.outputTextTokens,
    outputAudioTokens: a.outputAudioTokens + b.outputAudioTokens,
  };
}

const n = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;

type Raw = Record<string, unknown> | undefined;
const obj = (value: unknown): Raw =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

/**
 * `response.usage` of a realtime `response.done` event. OpenAI counts cached tokens as a
 * subset of the input text/audio tokens; here they are split out.
 */
export function usageFromRealtimeResponse(usage: unknown): TokenUsage {
  const input = obj(obj(usage)?.input_token_details);
  const cached = obj(input?.cached_tokens_details);
  const output = obj(obj(usage)?.output_token_details);
  const cachedText = n(cached?.text_tokens);
  const cachedAudio = n(cached?.audio_tokens);
  return {
    inputTextTokens: Math.max(0, n(input?.text_tokens) - cachedText),
    inputAudioTokens: Math.max(0, n(input?.audio_tokens) - cachedAudio),
    cachedTextTokens: cachedText,
    cachedAudioTokens: cachedAudio,
    outputTextTokens: n(output?.text_tokens),
    outputAudioTokens: n(output?.audio_tokens),
  };
}

/**
 * `usage` of a `conversation.item.input_audio_transcription.completed` event. Only the
 * token-billed variant is counted; duration-billed models (whisper-1) report seconds instead.
 */
export function usageFromTranscription(usage: unknown): TokenUsage {
  const raw = obj(usage);
  if (raw?.type !== 'tokens') return EMPTY_USAGE;
  const input = obj(raw.input_token_details);
  const audio = input ? n(input.audio_tokens) : n(raw.input_tokens);
  return {
    ...EMPTY_USAGE,
    inputAudioTokens: audio,
    inputTextTokens: input ? n(input.text_tokens) : 0,
    outputTextTokens: n(raw.output_tokens),
  };
}
