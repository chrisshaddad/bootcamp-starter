-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('draft', 'active', 'expired', 'terminated');

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentAmount" DECIMAL(12,2) NOT NULL,
    "depositAmount" DECIMAL(12,2) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'draft',
    "renewalTerms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lease_apartmentId_idx" ON "Lease"("apartmentId");

-- CreateIndex
CREATE INDEX "Lease_renterId_idx" ON "Lease"("renterId");

-- CreateIndex
CREATE INDEX "Lease_buildingId_idx" ON "Lease"("buildingId");

-- CreateIndex
CREATE INDEX "Lease_orgId_idx" ON "Lease"("orgId");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "Renter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
