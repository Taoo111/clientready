-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "connectCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "realtimeModel" TEXT;
