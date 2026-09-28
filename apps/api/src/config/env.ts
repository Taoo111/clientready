import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  /** Temporary protection of /admin endpoints until recruiter login (M4). Unset = admin disabled. */
  ADMIN_API_KEY: z.string().min(24, 'ADMIN_API_KEY must be at least 24 characters').optional(),
  /** Candidate links that were never used expire after this many days. */
  LINK_TTL_DAYS: z.coerce.number().int().positive().default(14),
  /** Max realtime connections (first connect + resumes) per assessment. */
  MAX_REALTIME_CONNECTS: z.coerce.number().int().positive().default(5),
  // Live conversation (OpenAI Realtime)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime-2.1-mini'),
  /** Reasoning effort for reasoning realtime models (gpt-realtime-2.x); 'none' omits it for older models. */
  OPENAI_REALTIME_REASONING_EFFORT: z
    .enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
    .default('minimal'),
  OPENAI_REALTIME_VOICE: z.string().default('marin'),
  OPENAI_TRANSCRIBE_MODEL: z.string().default('gpt-4o-mini-transcribe'),
  // Recordings
  STORAGE_DIR: z.string().default('storage'),
  MAX_RECORDING_MB: z.coerce.number().positive().default(50),
  // Evaluation (Anthropic) — used from milestone 3
  ANTHROPIC_API_KEY: z.string().optional(),
  EVAL_MODEL: z.string().default('claude-sonnet-5'),
});

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
