-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('SITE', 'ORG', 'EVENT');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('WHOLE_ORG', 'EVENT_ATTENDEES');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "scope" "AnnouncementScope" NOT NULL,
    "audience" "AnnouncementAudience",
    "organizationId" TEXT,
    "eventId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_organizationId_idx" ON "Announcement"("organizationId");

-- CreateIndex
CREATE INDEX "Announcement_eventId_idx" ON "Announcement"("eventId");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Announcement_scope_idx" ON "Announcement"("scope");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
