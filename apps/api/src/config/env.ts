import { z } from 'zod';
import { EVALUATION_PROVIDERS, type EvaluationProviderName } from '../evaluation/provider';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  /** Key for scripts/CLI calling /admin endpoints (header x-admin-key). Unset = key access disabled. */
  ADMIN_API_KEY: z.string().min(24, 'ADMIN_API_KEY must be at least 24 characters').optional(),
  /** Recruiter account created/updated at startup (panel login). */
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must be at least 12 characters').optional(),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  /** Candidate links that were never used expire after this many days. */
  LINK_TTL_DAYS: z.coerce.number().int().positive().default(14),
  /** Max realtime connections (first connect + resumes) per assessment. */
  MAX_REALTIME_CONNECTS: z.coerce.number().int().positive().default(5),
  // Live conversation (OpenAI Realtime)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime-2.1'),
  /** Reasoning effort for reasoning realtime models (gpt-realtime-2.x); 'none' omits it for older models. */
  OPENAI_REALTIME_REASONING_EFFORT: z
    .enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
    .default('minimal'),
  OPENAI_REALTIME_VOICE: z.string().default('marin'),
  OPENAI_TRANSCRIBE_MODEL: z.string().default('gpt-4o-mini-transcribe'),
  // Recordings
  STORAGE_DIR: z.string().default('storage'),
  MAX_RECORDING_MB: z.coerce.number().positive().default(50),
  // Evaluation (provider-independent)
  EVAL_PROVIDER: z.enum(EVALUATION_PROVIDERS).default('openai'),
  /** Defaults per provider: see DEFAULT_EVAL_MODELS. */
  EVAL_MODEL: z.string().optional(),
  EVAL_REASONING_EFFORT: z.enum(['low', 'medium', 'high']).default('high'),
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Conversations shorter than this are not scored ("insufficient data"). */
  EVAL_MIN_CONVERSATION_SEC: z.coerce.number().int().nonnegative().default(420),
  /** Minimum total candidate speech for a scored report. */
  EVAL_MIN_CANDIDATE_SPEECH_SEC: z.coerce.number().int().nonnegative().default(180),
  EVAL_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  /** Wait after the session ends before evaluating (late transcript flushes). */
  EVAL_START_DELAY_MS: z.coerce.number().int().nonnegative().default(10_000),
  /** First retry delay; doubles with each attempt. */
  EVAL_RETRY_DELAY_MS: z.coerce.number().int().nonnegative().default(30_000),
});

export const DEFAULT_EVAL_MODELS: Record<EvaluationProviderName, string> = {
  openai: 'gpt-6-sol',
  anthropic: 'claude-sonnet-5',
};

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  // Treat empty strings from .env (e.g. `OPENAI_API_KEY=`) as unset.
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  const result = EnvSchema.safeParse(cleaned);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
