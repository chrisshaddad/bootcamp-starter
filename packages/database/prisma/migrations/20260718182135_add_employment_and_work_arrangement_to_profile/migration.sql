-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "employmentType" "EmploymentType",
ADD COLUMN     "workArrangement" "WorkArrangement";
