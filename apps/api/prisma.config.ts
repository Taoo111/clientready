import { config } from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Single .env for the whole monorepo lives at the repo root (development only).
config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Not needed for `prisma generate` (e.g. while building the Docker image); required for
    // migrations, where the hosting platform provides it.
    url: process.env.DATABASE_URL ?? '',
  },
});
