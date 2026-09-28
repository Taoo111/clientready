import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  // Used from milestone 2 (conversation) and 3 (evaluation).
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime-mini'),
  ANTHROPIC_API_KEY: z.string().optional(),
  EVAL_MODEL: z.string().default('claude-sonnet-5'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
