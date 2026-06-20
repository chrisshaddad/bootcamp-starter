-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "mophId" VARCHAR(100),
    "atcCode" VARCHAR(20),
    "brandName" VARCHAR(200) NOT NULL,
    "type" VARCHAR(20),
    "dosage" VARCHAR(100),
    "form" VARCHAR(50),
    "ingredients" TEXT,
    "barcode" TEXT,
    "priceLbp" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medicines_barcode_key" ON "medicines"("barcode");

-- CreateIndex
CREATE INDEX "idx_medicine_name" ON "medicines"("brandName");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");
