-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED', 'PROJECT_ARCHIVED', 'PROJECT_RESTORED');

-- CreateEnum
CREATE TYPE "AdminAuditTargetType" AS ENUM ('USER', 'PROJECT');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedByUserId" TEXT,
ADD COLUMN     "moderationReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AdminAuditAction" NOT NULL,
    "targetType" "AdminAuditTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Project_moderatedByUserId_idx" ON "Project"("moderatedByUserId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
