/*
  Warnings:

  - Added the required column `updatedAt` to the `ProjectMedia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SavedProject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "ProjectMedia" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SavedProject" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectMember_addedByUserId_idx" ON "ProjectMember"("addedByUserId");

-- CreateIndex
CREATE INDEX "ProjectTechnology_addedByUserId_idx" ON "ProjectTechnology"("addedByUserId");
