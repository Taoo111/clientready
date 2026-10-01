-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('READY', 'READY_WITH_CONCERNS', 'NOT_READY');

-- CreateTable
CREATE TABLE "RecruiterDecision" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "verdict" "Recommendation" NOT NULL,
    "agreesWithAi" BOOLEAN NOT NULL,
    "comment" TEXT,
    "decidedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruiterDecision_assessmentId_createdAt_idx" ON "RecruiterDecision"("assessmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecruiterDecision" ADD CONSTRAINT "RecruiterDecision_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterDecision" ADD CONSTRAINT "RecruiterDecision_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
