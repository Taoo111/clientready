import type { PrismaClient } from '../generated/prisma/client';
import type { Storage } from '../storage/storage';
import { generateToken } from './create-assessment';

export const DELETED_CANDIDATE_NAME = '[dane usunięte]';

/**
 * Deletes a candidate's personal data on request (GDPR): recording files, recordings,
 * transcript and reports; anonymises the name and e-mail and invalidates the link.
 * The assessment row stays (status, dates) as a minimal record that it took place.
 */
export async function deleteCandidateData(
  prisma: Pick<
    PrismaClient,
    'assessment' | 'recording' | 'transcriptTurn' | 'report' | '$transaction'
  >,
  storage: Storage,
  assessmentId: string,
  now: Date,
): Promise<{ recordingFiles: number } | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { recordings: { select: { storageKey: true } } },
  });
  if (!assessment) return null;

  // Files first: if a delete fails, the rows remain and the request can be repeated.
  for (const recording of assessment.recordings) {
    await storage.delete(recording.storageKey);
  }
  await prisma.$transaction([
    prisma.recording.deleteMany({ where: { assessmentId } }),
    prisma.transcriptTurn.deleteMany({ where: { assessmentId } }),
    prisma.report.deleteMany({ where: { assessmentId } }),
    prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        candidateName: DELETED_CANDIDATE_NAME,
        candidateEmail: null,
        token: generateToken(),
        evaluationError: null,
        dataDeletedAt: now,
      },
    }),
  ]);
  return { recordingFiles: assessment.recordings.length };
}
