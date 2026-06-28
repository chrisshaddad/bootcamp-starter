-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "code" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Building_orgId_idx" ON "Building"("orgId");

-- CreateIndex
CREATE INDEX "BuildingAssignment_orgId_idx" ON "BuildingAssignment"("orgId");

-- CreateIndex
CREATE INDEX "BuildingAssignment_userId_idx" ON "BuildingAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingAssignment_userId_buildingId_key" ON "BuildingAssignment"("userId", "buildingId");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingAssignment" ADD CONSTRAINT "BuildingAssignment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
