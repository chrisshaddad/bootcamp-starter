import { NotFoundException } from '@nestjs/common';
import {
  AccountType,
  AnalyticsEventType,
  ProjectStatus,
  type Prisma,
} from '@repo/db';
import type { Queue } from 'bullmq';
import type { SessionService } from '../auth/session.service';
import type { DatabaseService } from '../database/prisma.service';
import { AnalyticsService } from './analytics.service';
import type { RecordAnalyticsVisitJobData } from './analytics.types';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const VISITOR_ID = '00000000-0000-4000-8000-000000000002';
const PROJECT_ID = '00000000-0000-4000-8000-000000000003';
const EVENT_ID = '00000000-0000-4000-8000-000000000004';
const HASH_SECRET = 'a'.repeat(32);

type AnalyticsProjectRow = {
  id: string;
  title: string;
  slug: string;
  status: ProjectStatus;
};

describe('AnalyticsService', () => {
  const projectFindFirst = jest.fn();
  const projectFindMany =
    jest.fn<
      (args: Prisma.ProjectFindManyArgs) => Promise<AnalyticsProjectRow[]>
    >();
  const profileFindUnique = jest.fn();
  const visitFindMany = jest.fn();
  const validateSession = jest.fn();
  const queueAdd = jest.fn();

  const database = {
    project: { findFirst: projectFindFirst, findMany: projectFindMany },
    developerProfile: { findUnique: profileFindUnique },
    analyticsVisit: { findMany: visitFindMany },
  } as unknown as DatabaseService;
  const sessionService = {
    validateSession,
  } as unknown as SessionService;
  const queue = {
    add: queueAdd,
  } as unknown as Queue<RecordAnalyticsVisitJobData>;
  const service = new AnalyticsService(database, sessionService, queue);
  const originalSecret = process.env.ANALYTICS_HASH_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANALYTICS_HASH_SECRET = HASH_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.ANALYTICS_HASH_SECRET;
    } else {
      process.env.ANALYTICS_HASH_SECRET = originalSecret;
    }
  });

  it('does not track visitors who enable Do Not Track', async () => {
    await expect(
      service.queueVisit(
        {
          eventId: EVENT_ID,
          eventType: 'PROJECT_VIEW',
          projectSlug: 'portfolio-api',
        },
        { visitorId: 'visitor-cookie', doNotTrack: '1' },
      ),
    ).resolves.toBe(false);

    expect(projectFindFirst).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('queues an eligible recruiter project view without storing identity data', async () => {
    validateSession.mockResolvedValue({
      id: VISITOR_ID,
      accountType: AccountType.HIRING,
    });
    projectFindFirst.mockResolvedValue({
      id: PROJECT_ID,
      createdByUserId: OWNER_ID,
      members: [],
    });
    queueAdd.mockResolvedValue({ id: 'job-id' });

    await expect(
      service.queueVisit(
        {
          eventId: EVENT_ID,
          eventType: 'PROJECT_VIEW',
          projectSlug: 'portfolio-api',
        },
        {
          visitorId: 'visitor-cookie',
          sessionId: 'session-id',
          referrer: 'https://www.linkedin.com/feed',
        },
      ),
    ).resolves.toBe(true);

    expect(queueAdd).toHaveBeenCalledTimes(1);
    const [jobName, jobData, options] = queueAdd.mock.calls[0] as [
      string,
      RecordAnalyticsVisitJobData,
      { attempts: number },
    ];
    expect(jobName).toBe('record-visit');
    expect(jobData).toMatchObject({
      eventType: AnalyticsEventType.PROJECT_VIEW,
      projectId: PROJECT_ID,
      developerUserId: OWNER_ID,
      visitorAccountType: AccountType.HIRING,
      referrerDomain: 'linkedin.com',
    });
    expect(jobData.visitorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(jobData.dedupeKey).toMatch(/^[a-f0-9]{64}$/);
    expect(options.attempts).toBe(3);
    expect(jobData).not.toHaveProperty('sessionId');
    expect(jobData).not.toHaveProperty('visitorId');
  });

  it('does not count a project owner viewing their own project', async () => {
    validateSession.mockResolvedValue({
      id: OWNER_ID,
      accountType: AccountType.DEVELOPER,
    });
    projectFindFirst.mockResolvedValue({
      id: PROJECT_ID,
      createdByUserId: OWNER_ID,
      members: [],
    });

    await expect(
      service.queueVisit(
        {
          eventId: EVENT_ID,
          eventType: 'PROJECT_VIEW',
          projectSlug: 'portfolio-api',
        },
        { visitorId: 'visitor-cookie', sessionId: 'session-id' },
      ),
    ).resolves.toBe(false);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('summarizes portfolio and accessible-project views', async () => {
    const occurredAt = new Date();
    projectFindMany.mockImplementation((query: Prisma.ProjectFindManyArgs) => {
      expect(query.where?.status).toBe(ProjectStatus.PUBLISHED);
      return Promise.resolve([
        {
          id: PROJECT_ID,
          title: 'Portfolio API',
          slug: 'portfolio-api',
          status: ProjectStatus.PUBLISHED,
        },
      ]);
    });
    visitFindMany
      .mockResolvedValueOnce([
        visit(
          AnalyticsEventType.PORTFOLIO_VIEW,
          null,
          'visitor-b',
          occurredAt,
          AccountType.HIRING,
        ),
        visit(
          AnalyticsEventType.PROJECT_VIEW,
          PROJECT_ID,
          'visitor-b',
          occurredAt,
          AccountType.HIRING,
          'linkedin.com',
        ),
      ])
      .mockResolvedValueOnce([{ visitorHash: 'visitor-c' }]);

    const result = await service.getOverview(OWNER_ID, '7D');

    expect(result.totals).toEqual({
      totalViews: 2,
      uniqueVisitors: 1,
      recruiterViews: 1,
      portfolioViews: 1,
      projectViews: 1,
    });
    expect(result.projects[0]).toMatchObject({
      id: PROJECT_ID,
      totalViews: 1,
      uniqueVisitors: 1,
      recruiterViews: 1,
    });
    expect(result.referrers).toEqual([{ source: 'linkedin.com', views: 1 }]);
    expect(result.daily).toHaveLength(7);
  });

  it('hides inaccessible project analytics behind a not-found response', async () => {
    projectFindFirst.mockResolvedValue(null);

    await expect(
      service.getProject(VISITOR_ID, PROJECT_ID, '30D'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function visit(
  eventType: AnalyticsEventType,
  projectId: string | null,
  visitorHash: string,
  occurredAt: Date,
  visitorAccountType: AccountType | null = null,
  referrerDomain: string | null = null,
) {
  return {
    eventType,
    projectId,
    visitorHash,
    visitorAccountType,
    referrerDomain,
    occurredAt,
  };
}
