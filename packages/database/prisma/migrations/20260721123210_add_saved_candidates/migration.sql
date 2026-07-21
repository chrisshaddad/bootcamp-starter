-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('SAVED', 'CONTACTED', 'REJECTED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "SavedCandidate" (
    "id" TEXT NOT NULL,
    "savedByUserId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'SAVED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedCandidate_savedByUserId_idx" ON "SavedCandidate"("savedByUserId");

-- CreateIndex
CREATE INDEX "SavedCandidate_candidateId_idx" ON "SavedCandidate"("candidateId");

-- CreateIndex
CREATE INDEX "SavedCandidate_status_idx" ON "SavedCandidate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SavedCandidate_savedByUserId_candidateId_key" ON "SavedCandidate"("savedByUserId", "candidateId");

-- AddForeignKey
ALTER TABLE "SavedCandidate" ADD CONSTRAINT "SavedCandidate_savedByUserId_fkey" FOREIGN KEY ("savedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCandidate" ADD CONSTRAINT "SavedCandidate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
