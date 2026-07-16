-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");
