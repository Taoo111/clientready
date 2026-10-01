import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../../config/env';
import { PrismaClient } from '../../generated/prisma/client';
import { pgOptions } from './pg-options';

/** Plain Prisma client for CLI scripts (the API itself injects PrismaService). */
export function createPrismaClient(
  env: Pick<Env, 'DATABASE_URL' | 'DATABASE_SSL_CA'>,
): PrismaClient {
  // `verified` only matters for the API's startup warning.
  const { verified, ...options } = pgOptions(env.DATABASE_URL, 2, env.DATABASE_SSL_CA);
  return new PrismaClient({ adapter: new PrismaPg(options) });
}
