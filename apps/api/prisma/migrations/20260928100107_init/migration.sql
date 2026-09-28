-- CreateEnum
CREATE TYPE "TargetLevel" AS ENUM ('B1', 'B2', 'C1');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'FAILED');

-- CreateEnum
CREATE TYPE "Speaker" AS ENUM ('AI', 'CANDIDATE');

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "roleTemplateId" TEXT NOT NULL,
    "targetLevel" "TargetLevel" NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT,
    "token" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'CREATED',
    "consentAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptTurn" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "speaker" "Speaker" NOT NULL,
    "text" TEXT NOT NULL,
    "startedAtMs" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "durationMs" INTEGER,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recruiter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_token_key" ON "Assessment"("token");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "Assessment_createdAt_idx" ON "Assessment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptTurn_assessmentId_seq_key" ON "TranscriptTurn"("assessmentId", "seq");

-- CreateIndex
CREATE INDEX "Recording_assessmentId_idx" ON "Recording"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_assessmentId_key" ON "Report"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_email_key" ON "Recruiter"("email");

-- AddForeignKey
ALTER TABLE "TranscriptTurn" ADD CONSTRAINT "TranscriptTurn_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
