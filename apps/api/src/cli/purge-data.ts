/**
 * Deletes assessments (transcripts, recordings, reports) older than DATA_RETENTION_DAYS.
 *
 *   pnpm purge-data [--dry-run]
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { validateEnv } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';
import { purgeExpiredData } from '../retention/purge';
import { LocalDiskStorage } from '../storage/local-disk.storage';

loadDotenv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: { 'dry-run': { type: 'boolean', default: false } },
  });
  const env = validateEnv(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    const result = await purgeExpiredData(prisma, new LocalDiskStorage(env.STORAGE_DIR), {
      now: new Date(),
      retentionDays: env.DATA_RETENTION_DAYS,
      dryRun: values['dry-run'],
    });
    const verb = values['dry-run'] ? 'Would delete' : 'Deleted';
    console.log(
      `${verb} ${result.assessments} assessment(s) and ${result.recordingFiles} recording file(s) ` +
        `older than ${env.DATA_RETENTION_DAYS} days (before ${result.cutoff.toISOString()}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
