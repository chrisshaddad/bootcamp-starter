-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PORTFOLIO_VIEW', 'PROJECT_VIEW');

-- CreateTable
CREATE TABLE "AnalyticsVisit" (
    "id" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "targetKey" TEXT NOT NULL,
    "developerUserId" TEXT NOT NULL,
    "projectId" TEXT,
    "visitorHash" TEXT NOT NULL,
    "visitorAccountType" "AccountType",
    "referrerDomain" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsVisit_dedupeKey_key" ON "AnalyticsVisit"("dedupeKey");

-- CreateIndex
CREATE INDEX "AnalyticsVisit_developerUserId_occurredAt_idx" ON "AnalyticsVisit"("developerUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsVisit_projectId_occurredAt_idx" ON "AnalyticsVisit"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsVisit_eventType_occurredAt_idx" ON "AnalyticsVisit"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsVisit_visitorAccountType_occurredAt_idx" ON "AnalyticsVisit"("visitorAccountType", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsVisit_visitorHash_idx" ON "AnalyticsVisit"("visitorHash");

-- AddForeignKey
ALTER TABLE "AnalyticsVisit" ADD CONSTRAINT "AnalyticsVisit_developerUserId_fkey" FOREIGN KEY ("developerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsVisit" ADD CONSTRAINT "AnalyticsVisit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
