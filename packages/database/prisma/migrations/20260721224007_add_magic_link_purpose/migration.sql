-- CreateEnum
CREATE TYPE "private"."MagicLinkPurpose" AS ENUM ('LOGIN', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "private"."MagicLink" ADD COLUMN     "purpose" "private"."MagicLinkPurpose" NOT NULL DEFAULT 'LOGIN';
