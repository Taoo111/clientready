import { DEFAULT_EVAL_MODELS, type Env } from '../config/env';
import { AnthropicEvaluationProvider } from './anthropic-evaluation.provider';
import { OpenAiEvaluationProvider } from './openai-evaluation.provider';
import type { EvaluationProvider } from './provider';

type EvalEnv = Pick<
  Env,
  'EVAL_PROVIDER' | 'EVAL_MODEL' | 'EVAL_REASONING_EFFORT' | 'OPENAI_API_KEY' | 'ANTHROPIC_API_KEY'
>;

/** Picks the evaluation provider from EVAL_PROVIDER / EVAL_MODEL. */
export function createEvaluationProvider(env: EvalEnv): EvaluationProvider {
  const model = env.EVAL_MODEL ?? DEFAULT_EVAL_MODELS[env.EVAL_PROVIDER];
  switch (env.EVAL_PROVIDER) {
    case 'openai':
      return new OpenAiEvaluationProvider({
        apiKey: env.OPENAI_API_KEY,
        model,
        reasoningEffort: env.EVAL_REASONING_EFFORT,
      });
    case 'anthropic':
      return new AnthropicEvaluationProvider({
        apiKey: env.ANTHROPIC_API_KEY,
        model,
        effort: env.EVAL_REASONING_EFFORT,
      });
  }
}
