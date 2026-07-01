/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the `AiInteraction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AiInteraction" DROP CONSTRAINT "AiInteraction_userId_fkey";

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "createdAt";

-- DropTable
DROP TABLE "AiInteraction";

-- CreateTable
CREATE TABLE "private"."AiInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "contextType" TEXT,
    "contextId" TEXT,
    "prompt" TEXT,
    "response" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiInteraction_userId_createdAt_idx" ON "private"."AiInteraction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "private"."AiInteraction" ADD CONSTRAINT "AiInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
