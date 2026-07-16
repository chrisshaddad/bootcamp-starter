-- AlterEnum
ALTER TYPE "BookCopyStatus" ADD VALUE 'SOLD';

-- AlterEnum
BEGIN;
CREATE TYPE "LibraryMembershipType_new" AS ENUM ('STUDENT', 'REGULAR', 'PREMIUM');
ALTER TABLE "LibraryMember" ALTER COLUMN "membershipType" TYPE "LibraryMembershipType_new" USING ("membershipType"::text::"LibraryMembershipType_new");
ALTER TYPE "LibraryMembershipType" RENAME TO "LibraryMembershipType_old";
ALTER TYPE "LibraryMembershipType_new" RENAME TO "LibraryMembershipType";
DROP TYPE "public"."LibraryMembershipType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "preferredCondition" "BookCopyCondition";

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "preferredCondition" "BookCopyCondition",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookCopyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cart_memberId_key" ON "Cart"("memberId");

-- CreateIndex
CREATE INDEX "Cart_organizationId_idx" ON "Cart"("organizationId");

-- CreateIndex
CREATE INDEX "CartItem_organizationId_idx" ON "CartItem"("organizationId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_bookId_idx" ON "CartItem"("bookId");

-- CreateIndex
CREATE INDEX "Purchase_organizationId_idx" ON "Purchase"("organizationId");

-- CreateIndex
CREATE INDEX "Purchase_bookCopyId_idx" ON "Purchase"("bookCopyId");

-- CreateIndex
CREATE INDEX "Purchase_memberId_idx" ON "Purchase"("memberId");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibraryMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "BookCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibraryMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

