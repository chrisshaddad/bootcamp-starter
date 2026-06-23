-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_pharmacyId_branchId_fkey";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_pharmacyId_branchId_fkey" FOREIGN KEY ("pharmacyId", "branchId") REFERENCES "pharmacy_branches"("pharmacyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_pharmacyId_fkey";

-- AddForeignKey
-- Restrict (not SetNull) keeps both pharmacyId-based FKs consistent: nulling pharmacyId
-- while branchId stays set would orphan branch assignments and race the branch FK on delete.
ALTER TABLE "users" ADD CONSTRAINT "users_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
