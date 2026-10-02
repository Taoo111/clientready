import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { EMPTY_USAGE, type TokenUsage } from '@clientready/shared';
import type { z } from 'zod';
import {
  EvaluationProvider,
  EvaluationProviderError,
  type EvaluationRequest,
  type EvaluationResponse,
} from './provider';

export interface AnthropicEvaluationOptions {
  apiKey: string | undefined;
  model: string;
  effort: 'low' | 'medium' | 'high';
}

/** Anthropic Messages API with structured outputs (`output_config.format` from zod). */
export class AnthropicEvaluationProvider extends EvaluationProvider {
  readonly provider = 'anthropic' as const;
  readonly model: string;
  private readonly client: Anthropic | undefined;

  constructor(private readonly options: AnthropicEvaluationOptions) {
    super();
    this.model = options.model;
    this.client = options.apiKey
      ? new Anthropic({ apiKey: options.apiKey, maxRetries: 2, timeout: 5 * 60_000 })
      : undefined;
  }

  async generate<T extends z.ZodType>(
    request: EvaluationRequest<T>,
  ): Promise<EvaluationResponse<T>> {
    if (!this.client) throw new EvaluationProviderError('ANTHROPIC_API_KEY is not set', false);

    let response;
    try {
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 16_000,
        thinking: { type: 'adaptive' },
        // The system prompt only depends on the role template and prompt version: cacheable.
        system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: request.user }],
        output_config: { effort: this.options.effort, format: zodOutputFormat(request.schema) },
      });
    } catch (error) {
      throw mapAnthropicError(error);
    }

    if (response.stop_reason === 'refusal') {
      throw new EvaluationProviderError('Model refused', false);
    }
    if (response.stop_reason === 'max_tokens') {
      throw new EvaluationProviderError('Output truncated (max_tokens)', true);
    }
    if (response.parsed_output == null) {
      throw new EvaluationProviderError('No parsed output', true);
    }
    return { output: response.parsed_output as z.infer<T>, usage: usageOf(response.usage) };
  }
}

/**
 * input_tokens excludes cache reads and writes. Cache writes (1.25x price, only the system
 * prompt) are counted as plain input: close enough for cost tracking.
 */
function usageOf(usage: Anthropic.Usage): TokenUsage {
  return {
    ...EMPTY_USAGE,
    inputTextTokens: usage.input_tokens + (usage.cache_creation_input_tokens ?? 0),
    cachedTextTokens: usage.cache_read_input_tokens ?? 0,
    outputTextTokens: usage.output_tokens,
  };
}

function mapAnthropicError(error: unknown): EvaluationProviderError {
  if (error instanceof EvaluationProviderError) return error;
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.InternalServerError ||
    error instanceof Anthropic.APIConnectionError
  ) {
    return new EvaluationProviderError(`Anthropic transient error: ${error.message}`, true);
  }
  if (error instanceof Anthropic.APIError) {
    return new EvaluationProviderError(`Anthropic error ${error.status}: ${error.message}`, false);
  }
  return new EvaluationProviderError(
    `Anthropic output error: ${error instanceof Error ? error.message : String(error)}`,
    true,
  );
}
