/*
  Warnings:

  - The primary key for the `CourseDailyStat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `updatedAt` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ChatThread` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AssignmentType" ADD VALUE 'exam';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'text';
ALTER TYPE "QuestionType" ADD VALUE 'paragraph';
ALTER TYPE "QuestionType" ADD VALUE 'file_upload';

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "noteToStudents" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "name" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "type" SET DEFAULT 'direct';

-- AlterTable
ALTER TABLE "CourseDailyStat" DROP CONSTRAINT "CourseDailyStat_pkey",
ALTER COLUMN "statDate" SET DATA TYPE DATE,
ADD CONSTRAINT "CourseDailyStat_pkey" PRIMARY KEY ("courseId", "statDate");

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "totalPoints" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "teacherNote" TEXT;

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "sectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_studentCode_key" ON "StudentProfile"("studentCode");

-- CreateIndex
CREATE INDEX "StudentProfile_sectionId_idx" ON "StudentProfile"("sectionId");

-- CreateIndex
CREATE INDEX "ChatThread_courseId_idx" ON "ChatThread"("courseId");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentId_idx" ON "QuizAttempt"("studentId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
