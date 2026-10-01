import type { PrismaClient } from '../generated/prisma/client';
import type { Storage } from '../infra/storage/storage';

export interface PurgeOptions {
  now: Date;
  retentionDays: number;
  dryRun?: boolean;
}

export interface PurgeResult {
  assessments: number;
  recordingFiles: number;
  cutoff: Date;
}

const DAY_MS = 24 * 60 * 60_000;

/**
 * Deletes assessments whose conversation ended (or, if never held, which were created)
 * more than `retentionDays` ago: recordings on disk, then the assessment with its
 * transcript, recordings and reports (cascade). Plain function so a CLI can run it.
 */
export async function purgeExpiredData(
  prisma: Pick<PrismaClient, 'assessment'>,
  storage: Storage,
  options: PurgeOptions,
): Promise<PurgeResult> {
  const cutoff = new Date(options.now.getTime() - options.retentionDays * DAY_MS);
  const expired = await prisma.assessment.findMany({
    where: {
      OR: [{ endedAt: { lt: cutoff } }, { endedAt: null, createdAt: { lt: cutoff } }],
    },
    select: { id: true, recordings: { select: { storageKey: true } } },
  });
  const recordingFiles = expired.reduce((sum, a) => sum + a.recordings.length, 0);
  if (options.dryRun) return { assessments: expired.length, recordingFiles, cutoff };

  for (const assessment of expired) {
    // Files first: if deleting a file fails, the row stays and the next run retries.
    for (const recording of assessment.recordings) {
      await storage.delete(recording.storageKey);
    }
    await prisma.assessment.delete({ where: { id: assessment.id } });
  }
  return { assessments: expired.length, recordingFiles, cutoff };
}
