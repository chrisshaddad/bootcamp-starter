import type { AccountType, AnalyticsEventType } from '@repo/db';

export interface RecordAnalyticsVisitJobData {
  eventType: AnalyticsEventType;
  targetKey: string;
  developerUserId: string;
  projectId: string | null;
  visitorHash: string;
  visitorAccountType: AccountType | null;
  referrerDomain: string | null;
  dedupeKey: string;
  occurredAt: string;
}

export interface AnalyticsRequestContext {
  visitorId: string;
  sessionId?: string;
  userAgent?: string;
  doNotTrack?: string;
  referrer?: string;
}
