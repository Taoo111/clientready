import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

loadDotenv({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

/** E2E tests use a separate database next to the dev one (`<db>_test`), unless TEST_DATABASE_URL is set. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL (or TEST_DATABASE_URL) must be set for e2e tests');
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/^\//, '')}_test`;
  return url.toString();
}

export const TEST_ADMIN_KEY = 'test-admin-key-0123456789abcdef';
