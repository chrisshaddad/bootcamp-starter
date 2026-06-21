/*
  Warnings:

  - Added the required column `updatedAt` to the `CheckIn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SessionBooking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SessionBooking" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
