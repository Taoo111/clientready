-- DropIndex
DROP INDEX "Report_assessmentId_key";

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "evaluationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "evaluationError" TEXT;

-- AlterTable
ALTER TABLE "TranscriptTurn" ADD COLUMN     "durationMs" INTEGER;

-- CreateIndex
CREATE INDEX "Report_assessmentId_createdAt_idx" ON "Report"("assessmentId", "createdAt");
