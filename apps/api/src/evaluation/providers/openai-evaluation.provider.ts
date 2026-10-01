import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import { EvaluationProvider, EvaluationProviderError, type EvaluationRequest } from './provider';

export interface OpenAiEvaluationOptions {
  apiKey: string | undefined;
  model: string;
  reasoningEffort: 'low' | 'medium' | 'high';
}

/** OpenAI Responses API with Structured Outputs (strict JSON schema from zod). */
export class OpenAiEvaluationProvider extends EvaluationProvider {
  readonly provider = 'openai' as const;
  readonly model: string;
  private readonly client: OpenAI | undefined;

  constructor(private readonly options: OpenAiEvaluationOptions) {
    super();
    this.model = options.model;
    this.client = options.apiKey
      ? new OpenAI({ apiKey: options.apiKey, maxRetries: 2, timeout: 5 * 60_000 })
      : undefined;
  }

  async generate<T extends z.ZodType>(request: EvaluationRequest<T>): Promise<z.infer<T>> {
    if (!this.client) throw new EvaluationProviderError('OPENAI_API_KEY is not set', false);

    let response;
    try {
      response = await this.client.responses.parse({
        model: this.model,
        instructions: request.system,
        input: request.user,
        reasoning: { effort: this.options.reasoningEffort },
        max_output_tokens: 32_000,
        text: { format: zodTextFormat(request.schema, request.schemaName) },
      });
    } catch (error) {
      throw mapOpenAiError(error);
    }

    if (response.status === 'incomplete') {
      throw new EvaluationProviderError(
        `Incomplete response: ${response.incomplete_details?.reason ?? 'unknown'}`,
        true,
      );
    }
    const refusal = response.output
      .flatMap((item) => (item.type === 'message' ? item.content : []))
      .find((content) => content.type === 'refusal');
    if (refusal) {
      throw new EvaluationProviderError(`Model refused: ${refusal.refusal}`, false);
    }
    if (response.output_parsed == null) {
      throw new EvaluationProviderError('No parsed output', true);
    }
    return response.output_parsed as z.infer<T>;
  }
}

function mapOpenAiError(error: unknown): EvaluationProviderError {
  if (error instanceof EvaluationProviderError) return error;
  if (
    error instanceof OpenAI.RateLimitError ||
    error instanceof OpenAI.InternalServerError ||
    error instanceof OpenAI.APIConnectionError
  ) {
    return new EvaluationProviderError(`OpenAI transient error: ${error.message}`, true);
  }
  if (error instanceof OpenAI.APIError) {
    return new EvaluationProviderError(`OpenAI error ${error.status}: ${error.message}`, false);
  }
  // e.g. zod validation of the parsed output
  return new EvaluationProviderError(
    `OpenAI output error: ${error instanceof Error ? error.message : String(error)}`,
    true,
  );
}
