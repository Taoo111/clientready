import { config } from 'dotenv';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// Single .env for the whole monorepo lives at the repo root.
config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
