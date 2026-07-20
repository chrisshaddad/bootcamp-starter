-- AlterTable
ALTER TABLE "Renter" ADD COLUMN "renterUserId" TEXT;

-- CreateIndex
CREATE INDEX "Renter_renterUserId_idx" ON "Renter"("renterUserId");
