-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'ATTENDED', 'SKIPPED');

-- AlterTable
ALTER TABLE "EventAttendee" ADD COLUMN "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'PENDING';
