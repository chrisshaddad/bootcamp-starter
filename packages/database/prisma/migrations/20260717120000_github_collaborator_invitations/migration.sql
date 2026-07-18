-- CreateEnum
CREATE TYPE "ProjectInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "VerificationSource" ADD VALUE 'GITHUB_OWNER';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubOwnershipVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "githubRoleName" TEXT,
ADD COLUMN     "githubUserId" BIGINT;

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "isFork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerGithubUserId" BIGINT,
ADD COLUMN     "ownerType" TEXT;

-- CreateTable
CREATE TABLE "ProjectInvitation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "inviteeUserId" TEXT,
    "inviteeGithubUserId" BIGINT NOT NULL,
    "inviteeGithubUsername" TEXT NOT NULL,
    "requestedRole" "ProjectRoleKey" NOT NULL,
    "contributionRoleLabel" TEXT,
    "githubPermission" TEXT,
    "githubRoleName" TEXT,
    "status" "ProjectInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "pendingKey" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvitation_pendingKey_key" ON "ProjectInvitation"("pendingKey");

-- CreateIndex
CREATE INDEX "ProjectInvitation_projectId_status_createdAt_idx" ON "ProjectInvitation"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectInvitation_inviteeUserId_status_createdAt_idx" ON "ProjectInvitation"("inviteeUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectInvitation_inviteeGithubUserId_status_idx" ON "ProjectInvitation"("inviteeGithubUserId", "status");

-- CreateIndex
CREATE INDEX "ProjectInvitation_status_expiresAt_idx" ON "ProjectInvitation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ProjectInvitation_invitedByUserId_idx" ON "ProjectInvitation"("invitedByUserId");

-- CreateIndex
CREATE INDEX "ProjectMember_githubUserId_idx" ON "ProjectMember"("githubUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_githubUserId_key" ON "ProjectMember"("projectId", "githubUserId");

-- AddForeignKey
ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
