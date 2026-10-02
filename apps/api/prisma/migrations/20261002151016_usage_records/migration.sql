-- CreateEnum
CREATE TYPE "UsageSource" AS ENUM ('REALTIME', 'TRANSCRIPTION', 'EVALUATION');

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "source" "UsageSource" NOT NULL,
    "model" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "inputTextTokens" INTEGER NOT NULL,
    "inputAudioTokens" INTEGER NOT NULL,
    "cachedTextTokens" INTEGER NOT NULL,
    "cachedAudioTokens" INTEGER NOT NULL,
    "outputTextTokens" INTEGER NOT NULL,
    "outputAudioTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageRecord_createdAt_idx" ON "UsageRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_assessmentId_source_ref_key" ON "UsageRecord"("assessmentId", "source", "ref");

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
