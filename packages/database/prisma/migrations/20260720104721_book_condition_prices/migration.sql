-- AlterTable
ALTER TABLE "Book" DROP COLUMN "salePrice";

-- CreateTable
CREATE TABLE "BookConditionPrice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "condition" "BookCopyCondition" NOT NULL,
    "rentPrice" DECIMAL(10,2) NOT NULL,
    "buyPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "BookConditionPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookConditionPrice_organizationId_idx" ON "BookConditionPrice"("organizationId");

-- CreateIndex
CREATE INDEX "BookConditionPrice_bookId_idx" ON "BookConditionPrice"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BookConditionPrice_bookId_condition_key" ON "BookConditionPrice"("bookId", "condition");

-- AddForeignKey
ALTER TABLE "BookConditionPrice" ADD CONSTRAINT "BookConditionPrice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookConditionPrice" ADD CONSTRAINT "BookConditionPrice_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

