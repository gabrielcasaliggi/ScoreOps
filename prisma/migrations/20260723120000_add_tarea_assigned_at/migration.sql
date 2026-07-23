-- AlterTable
ALTER TABLE "Tarea" ADD COLUMN "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: existing rows use createdAt as assignment time
UPDATE "Tarea" SET "assignedAt" = "createdAt";
