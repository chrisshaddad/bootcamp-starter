/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ProjectMedia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SavedProject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectMedia" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SavedProject" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- CreateIndex
CREATE INDEX "ProjectMember_addedByUserId_idx" ON "ProjectMember"("addedByUserId");

-- CreateIndex
CREATE INDEX "ProjectTechnology_addedByUserId_idx" ON "ProjectTechnology"("addedByUserId");
