-- AlterTable
-- Backfill existing rows with CURRENT_TIMESTAMP so the NOT NULL add succeeds on non-empty tables.
-- Prisma's @updatedAt continues to manage the column on every write after this.
ALTER TABLE "magic_links" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
