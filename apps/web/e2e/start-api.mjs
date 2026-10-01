// Starts the real API for the browser tests: fresh `<db>_ui` database, migrations, and a
// build of apps/api, with every paid AI provider switched off.
import { execSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../api');
const databaseUrl = new URL(process.env.E2E_DATABASE_URL);
const dbName = databaseUrl.pathname.replace(/^\//, '');

async function recreateDatabase() {
  const admin = new URL(databaseUrl);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl.toString(),
  // Never call OpenAI/Anthropic from UI tests (even if the developer's .env has keys).
  OPENAI_API_KEY: '',
  ANTHROPIC_API_KEY: '',
  STORAGE_DRIVER: 'local',
  STORAGE_DIR: path.join(tmpdir(), 'clientready-ui-storage'),
  RETENTION_PURGE_INTERVAL_HOURS: '0',
  EVAL_START_DELAY_MS: '600000',
};

await recreateDatabase();
const run = (command) => execSync(command, { cwd: apiDir, env, stdio: 'inherit' });
run('pnpm exec prisma migrate deploy');
run('pnpm run build');

const api = spawn(process.execPath, ['dist/main.js'], { cwd: apiDir, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => api.kill(signal));
api.on('exit', (code) => process.exit(code ?? 0));
