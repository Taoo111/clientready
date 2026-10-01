/**
 * Deletes assessments (transcripts, recordings, reports) older than DATA_RETENTION_DAYS.
 *
 *   pnpm purge-data [--dry-run]
 */
import { parseArgs } from 'node:util';
import { createPrismaClient } from '../infra/prisma/create-prisma-client';
import { createStorage } from '../infra/storage/create-storage';
import { purgeExpiredData } from '../retention/purge';
import { cliArgs, loadEnv, runCli } from './cli';

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: cliArgs(),
    options: { 'dry-run': { type: 'boolean', default: false } },
  });
  const env = loadEnv();
  const prisma = createPrismaClient(env);
  try {
    const result = await purgeExpiredData(prisma, createStorage(env), {
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

runCli(main);
