-- CreateTable
CREATE TABLE "Renter" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Renter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Renter_orgId_idx" ON "Renter"("orgId");
