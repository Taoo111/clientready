import type { z } from 'zod';

export const EVALUATION_PROVIDERS = ['openai', 'anthropic'] as const;
export type EvaluationProviderName = (typeof EVALUATION_PROVIDERS)[number];

export interface EvaluationRequest<T extends z.ZodType> {
  system: string;
  user: string;
  /** The same zod schema is used for every provider; each turns it into its JSON schema format. */
  schema: T;
  schemaName: string;
}

/**
 * An LLM that returns structured output validated against a zod schema. Implementations
 * must throw `EvaluationProviderError` so the job can decide whether to retry.
 */
export abstract class EvaluationProvider {
  abstract readonly provider: EvaluationProviderName;
  abstract readonly model: string;
  abstract generate<T extends z.ZodType>(request: EvaluationRequest<T>): Promise<z.infer<T>>;
}

export class EvaluationProviderError extends Error {
  constructor(
    message: string,
    /** Transient (rate limit, server/network error, malformed output) — worth retrying. */
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
