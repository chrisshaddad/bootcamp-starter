-- CreateEnum
CREATE TYPE "ApartmentStatus" AS ENUM ('vacant', 'occupied', 'maintenance', 'unavailable');

-- CreateTable
CREATE TABLE "Apartment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL,
    "sqft" INTEGER,
    "status" "ApartmentStatus" NOT NULL DEFAULT 'vacant',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Apartment_floorId_idx" ON "Apartment"("floorId");

-- CreateIndex
CREATE INDEX "Apartment_buildingId_idx" ON "Apartment"("buildingId");

-- CreateIndex
CREATE INDEX "Apartment_orgId_idx" ON "Apartment"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_buildingId_unitNumber_key" ON "Apartment"("buildingId", "unitNumber");

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
