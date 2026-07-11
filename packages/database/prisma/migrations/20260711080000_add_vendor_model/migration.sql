-- CreateEnum
CREATE TYPE "VendorServiceType" AS ENUM ('plumbing', 'electrical', 'cleaning', 'landscaping', 'hvac', 'general_maintenance', 'other');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "servicesOffered" "VendorServiceType"[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_orgId_idx" ON "Vendor"("orgId");
