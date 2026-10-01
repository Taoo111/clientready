import path from 'node:path';

/** Settings shared by the Playwright config, the API launcher and the tests. */

try {
  // Local runs: the repo-root .env provides DATABASE_URL (CI sets it directly).
  process.loadEnvFile(path.resolve(__dirname, '../../../.env'));
} catch {
  // No .env file.
}

export const WEB_URL = 'http://localhost:3100';
export const API_URL = 'http://localhost:3101';
export const ADMIN_API_KEY = 'ui-test-admin-key-0123456789abcdef';
export const ADMIN = { email: 'recruiter@example.com', password: 'correct horse battery staple' };

function databaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL (or E2E_DATABASE_URL) must be set for UI tests');
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/^\//, '')}_ui`;
  return url.toString();
}

/** Separate from the dev and API-e2e databases; wiped on every run. */
export const E2E_DATABASE_URL = databaseUrl();
