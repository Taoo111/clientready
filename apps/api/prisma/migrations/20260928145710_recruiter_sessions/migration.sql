-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "dataDeletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RecruiterSession" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterSession_tokenHash_key" ON "RecruiterSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RecruiterSession_expiresAt_idx" ON "RecruiterSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "RecruiterSession" ADD CONSTRAINT "RecruiterSession_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
