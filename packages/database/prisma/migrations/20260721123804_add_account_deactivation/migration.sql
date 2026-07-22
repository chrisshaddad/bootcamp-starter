-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'DEACTIVATED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);
