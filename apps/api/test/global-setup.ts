import { execSync } from 'node:child_process';
import path from 'node:path';
import { Client } from 'pg';
import { testDatabaseUrl } from './test-env';

/** Creates the e2e database if needed and applies migrations. */
export default async function setup(): Promise<void> {
  const url = new URL(testDatabaseUrl());
  const dbName = url.pathname.replace(/^\//, '');
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    }
  } finally {
    await client.end();
  }

  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe',
  });
}
