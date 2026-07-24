-- AlterEnum
ALTER TYPE "AnnouncementScope" ADD VALUE 'GROUP';

-- CreateTable
CREATE TABLE "AnnouncementGroup" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementGroup_announcementId_idx" ON "AnnouncementGroup"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementGroup_groupId_idx" ON "AnnouncementGroup"("groupId");

-- CreateIndex
CREATE INDEX "AnnouncementGroup_organizationId_idx" ON "AnnouncementGroup"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementGroup_announcementId_groupId_key" ON "AnnouncementGroup"("announcementId", "groupId");

-- AddForeignKey
ALTER TABLE "AnnouncementGroup" ADD CONSTRAINT "AnnouncementGroup_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementGroup" ADD CONSTRAINT "AnnouncementGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementGroup" ADD CONSTRAINT "AnnouncementGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
