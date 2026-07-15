-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('ROLE', 'PROJECT', 'ROTATION');

-- AlterTable
ALTER TABLE "Opportunity"
  ALTER COLUMN "type" TYPE "OpportunityType" USING ("type"::"OpportunityType");
