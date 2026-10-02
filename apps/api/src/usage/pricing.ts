import type { TokenUsage } from '@clientready/shared';

/** USD per 1M tokens. */
interface Rates {
  input: number;
  cached: number;
  output: number;
}

interface ModelPrice {
  text: Rates;
  /** Missing for text-only models. */
  audio?: Rates;
}

/**
 * List prices (standard tier) checked on 2026-10-02 at developers.openai.com/api/docs/pricing
 * and platform.claude.com/docs/en/about-claude/pricing. Update when a model or price changes;
 * unknown models are reported without a cost rather than guessed.
 */
const PRICES: Record<string, ModelPrice> = {
  'gpt-realtime-2.1': {
    text: { input: 4, cached: 0.4, output: 24 },
    audio: { input: 32, cached: 0.4, output: 64 },
  },
  'gpt-realtime-2.1-mini': {
    text: { input: 0.6, cached: 0.06, output: 2.4 },
    audio: { input: 10, cached: 0.3, output: 20 },
  },
  // Transcription: no caching; audio in, text out.
  'gpt-4o-mini-transcribe': {
    text: { input: 1.25, cached: 1.25, output: 5 },
    audio: { input: 2.5, cached: 2.5, output: 0 },
  },
  'gpt-4o-transcribe': {
    text: { input: 2.5, cached: 2.5, output: 10 },
    audio: { input: 2.5, cached: 2.5, output: 0 },
  },
  // Up to 272K context, which evaluations never exceed.
  'gpt-6-sol': { text: { input: 2, cached: 0.2, output: 10 } },
  'claude-sonnet-5': { text: { input: 2, cached: 0.2, output: 10 } },
};

/** Dated snapshots ("gpt-realtime-2.1-2026-08-28") cost the same as their alias. */
function priceOf(model: string): ModelPrice | undefined {
  return PRICES[model] ?? PRICES[model.replace(/-\d{4}-\d{2}-\d{2}$/, '')];
}

/** Estimated cost in USD, or null when the model is not in the price list. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const price = priceOf(model);
  if (!price) return null;
  const audio = price.audio ?? { input: 0, cached: 0, output: 0 };
  const micro =
    usage.inputTextTokens * price.text.input +
    usage.cachedTextTokens * price.text.cached +
    usage.outputTextTokens * price.text.output +
    usage.inputAudioTokens * audio.input +
    usage.cachedAudioTokens * audio.cached +
    usage.outputAudioTokens * audio.output;
  return micro / 1_000_000;
}
