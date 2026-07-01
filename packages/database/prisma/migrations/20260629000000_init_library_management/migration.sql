-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "private";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'LIBRARIAN', 'MEMBER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LibraryMemberStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LibraryMembershipType" AS ENUM ('STUDENT', 'ADULT', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BookCopyStatus" AS ENUM ('AVAILABLE', 'ON_LOAN', 'RESERVED', 'LOST', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BookCopyCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'READY_FOR_PICKUP', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "bio" TEXT,
    "phoneNumber" TEXT,
    "street1" TEXT,
    "street2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "profilePictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private"."MagicLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "libraryCardNumber" TEXT NOT NULL,
    "membershipType" "LibraryMembershipType" NOT NULL,
    "membershipStatus" "LibraryMemberStatus" NOT NULL,
    "membershipStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membershipEndDate" TIMESTAMP(3),

    CONSTRAINT "LibraryMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "nationality" TEXT,
    "birthYear" INTEGER,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publisherId" TEXT,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "publishedDate" TIMESTAMP(3),
    "language" TEXT,
    "pageCount" INTEGER,
    "coverUrl" TEXT,
    "salePrice" DECIMAL(10,2),
    "edition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookAuthor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "BookAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "BookCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCopy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "status" "BookCopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "BookCopyCondition" NOT NULL DEFAULT 'GOOD',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookCopyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "rentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finePaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notifiedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "private"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "private"."MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_token_idx" ON "private"."MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_userId_idx" ON "private"."MagicLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_createdById_key" ON "Organization"("createdById");

-- CreateIndex
CREATE INDEX "Organization_approvedById_idx" ON "Organization"("approvedById");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryMember_userId_key" ON "LibraryMember"("userId");

-- CreateIndex
CREATE INDEX "LibraryMember_organizationId_idx" ON "LibraryMember"("organizationId");

-- CreateIndex
CREATE INDEX "LibraryMember_userId_idx" ON "LibraryMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryMember_organizationId_libraryCardNumber_key" ON "LibraryMember"("organizationId", "libraryCardNumber");

-- CreateIndex
CREATE INDEX "Author_organizationId_idx" ON "Author"("organizationId");

-- CreateIndex
CREATE INDEX "Author_organizationId_name_idx" ON "Author"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Category_organizationId_idx" ON "Category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_organizationId_name_key" ON "Category"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Publisher_organizationId_idx" ON "Publisher"("organizationId");

-- CreateIndex
CREATE INDEX "Publisher_organizationId_name_idx" ON "Publisher"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Book_organizationId_idx" ON "Book"("organizationId");

-- CreateIndex
CREATE INDEX "Book_publisherId_idx" ON "Book"("publisherId");

-- CreateIndex
CREATE INDEX "Book_organizationId_title_idx" ON "Book"("organizationId", "title");

-- CreateIndex
CREATE INDEX "Book_organizationId_isbn_idx" ON "Book"("organizationId", "isbn");

-- CreateIndex
CREATE INDEX "BookAuthor_organizationId_idx" ON "BookAuthor"("organizationId");

-- CreateIndex
CREATE INDEX "BookAuthor_authorId_idx" ON "BookAuthor"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "BookAuthor_bookId_authorId_key" ON "BookAuthor"("bookId", "authorId");

-- CreateIndex
CREATE INDEX "BookCategory_organizationId_idx" ON "BookCategory"("organizationId");

-- CreateIndex
CREATE INDEX "BookCategory_categoryId_idx" ON "BookCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BookCategory_bookId_categoryId_key" ON "BookCategory"("bookId", "categoryId");

-- CreateIndex
CREATE INDEX "BookCopy_organizationId_idx" ON "BookCopy"("organizationId");

-- CreateIndex
CREATE INDEX "BookCopy_bookId_idx" ON "BookCopy"("bookId");

-- CreateIndex
CREATE INDEX "BookCopy_organizationId_status_idx" ON "BookCopy"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookCopy_organizationId_barcode_key" ON "BookCopy"("organizationId", "barcode");

-- CreateIndex
CREATE INDEX "Rental_organizationId_idx" ON "Rental"("organizationId");

-- CreateIndex
CREATE INDEX "Rental_bookCopyId_idx" ON "Rental"("bookCopyId");

-- CreateIndex
CREATE INDEX "Rental_memberId_idx" ON "Rental"("memberId");

-- CreateIndex
CREATE INDEX "Rental_staffId_idx" ON "Rental"("staffId");

-- CreateIndex
CREATE INDEX "Rental_organizationId_status_idx" ON "Rental"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Rental_organizationId_dueDate_idx" ON "Rental"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "Reservation_organizationId_idx" ON "Reservation"("organizationId");

-- CreateIndex
CREATE INDEX "Reservation_bookId_idx" ON "Reservation"("bookId");

-- CreateIndex
CREATE INDEX "Reservation_memberId_idx" ON "Reservation"("memberId");

-- CreateIndex
CREATE INDEX "Reservation_organizationId_status_idx" ON "Reservation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Reservation_organizationId_expiresAt_idx" ON "Reservation"("organizationId", "expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private"."MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryMember" ADD CONSTRAINT "LibraryMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryMember" ADD CONSTRAINT "LibraryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publisher" ADD CONSTRAINT "Publisher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCategory" ADD CONSTRAINT "BookCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCategory" ADD CONSTRAINT "BookCategory_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCategory" ADD CONSTRAINT "BookCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCopy" ADD CONSTRAINT "BookCopy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCopy" ADD CONSTRAINT "BookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "BookCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibraryMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibraryMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
