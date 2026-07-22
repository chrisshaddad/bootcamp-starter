import { createHmac } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AccountType,
  AnalyticsEventType,
  Prisma,
  ProjectStatus,
  VerificationStatus,
} from '@repo/db';
import type {
  AnalyticsDailyPoint,
  AnalyticsOverviewResponse,
  AnalyticsProjectResponse,
  AnalyticsRange,
  AnalyticsReferrer,
  AnalyticsTotals,
  AnalyticsTrackRequest,
} from '@repo/contracts';
import type { Queue } from 'bullmq';
import { SessionService } from '../auth/session.service';
import { DatabaseService } from '../database/prisma.service';
import {
  ANALYTICS_DEDUPE_WINDOW_MS,
  ANALYTICS_JOBS,
  ANALYTICS_QUEUE,
} from './analytics.constants';
import type {
  AnalyticsRequestContext,
  RecordAnalyticsVisitJobData,
} from './analytics.types';

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
};

const BOT_PATTERN =
  /bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot|whatsapp|headless/i;

const analyticsVisitSelect = {
  eventType: true,
  projectId: true,
  visitorHash: true,
  visitorAccountType: true,
  referrerDomain: true,
  occurredAt: true,
} satisfies Prisma.AnalyticsVisitSelect;

type AnalyticsVisitRecord = Prisma.AnalyticsVisitGetPayload<{
  select: typeof analyticsVisitSelect;
}>;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private hasWarnedAboutMissingSecret = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly sessionService: SessionService,
    @InjectQueue(ANALYTICS_QUEUE)
    private readonly analyticsQueue: Queue<RecordAnalyticsVisitJobData>,
  ) {}

  async queueVisit(
    input: AnalyticsTrackRequest,
    context: AnalyticsRequestContext,
  ): Promise<boolean> {
    if (
      context.doNotTrack === '1' ||
      BOT_PATTERN.test(context.userAgent ?? '')
    ) {
      return false;
    }

    const secret = process.env.ANALYTICS_HASH_SECRET;
    if (!secret || secret.length < 32) {
      if (!this.hasWarnedAboutMissingSecret) {
        this.logger.warn(
          'Analytics tracking is disabled because ANALYTICS_HASH_SECRET is not configured with at least 32 characters.',
        );
        this.hasWarnedAboutMissingSecret = true;
      }
      return false;
    }

    const visitor = await this.getOptionalVisitor(context.sessionId);
    const target = await this.resolveTarget(input);
    if (!target) return false;
    if (
      visitor &&
      (visitor.id === target.developerUserId ||
        target.memberUserIds.includes(visitor.id))
    ) {
      return false;
    }

    const occurredAt = new Date();
    const visitorHash = this.hmac(secret, context.visitorId);
    const bucket = Math.floor(
      occurredAt.getTime() / ANALYTICS_DEDUPE_WINDOW_MS,
    );
    const dedupeKey = this.hmac(
      secret,
      `${visitorHash}|${target.targetKey}|${bucket}`,
    );

    try {
      await this.analyticsQueue.add(
        ANALYTICS_JOBS.RECORD_VISIT,
        {
          eventType: target.eventType,
          targetKey: target.targetKey,
          developerUserId: target.developerUserId,
          projectId: target.projectId,
          visitorHash,
          visitorAccountType: visitor?.accountType ?? null,
          referrerDomain: this.getReferrerDomain(context.referrer),
          dedupeKey,
          occurredAt: occurredAt.toISOString(),
        },
        {
          jobId: dedupeKey,
          attempts: 3,
          backoff: { type: 'exponential', delay: 500 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Analytics event could not be queued: ${error instanceof Error ? error.message : 'unknown queue error'}`,
      );
      return false;
    }
  }

  async getOverview(
    userId: string,
    range: AnalyticsRange,
  ): Promise<AnalyticsOverviewResponse> {
    const period = this.getPeriod(range);
    const projects = await this.database.project.findMany({
      where: {
        ...this.accessibleProjectWhere(userId),
        status: ProjectStatus.PUBLISHED,
      },
      select: { id: true, title: true, slug: true, status: true },
      orderBy: { updatedAt: 'desc' },
    });
    const projectIds = projects.map((project) => project.id);
    const eventScope: Prisma.AnalyticsVisitWhereInput = {
      OR: [
        {
          developerUserId: userId,
          eventType: AnalyticsEventType.PORTFOLIO_VIEW,
        },
        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
      ],
    };
    const [visits, previousVisits] = await Promise.all([
      this.database.analyticsVisit.findMany({
        where: {
          ...eventScope,
          occurredAt: { gte: period.from, lte: period.to },
        },
        select: analyticsVisitSelect,
      }),
      this.database.analyticsVisit.findMany({
        where: {
          ...eventScope,
          occurredAt: { gte: period.previousFrom, lt: period.from },
        },
        select: { visitorHash: true },
      }),
    ]);

    const projectVisits = new Map<string, AnalyticsVisitRecord[]>();
    visits.forEach((visit) => {
      if (!visit.projectId) return;
      const existing = projectVisits.get(visit.projectId) ?? [];
      existing.push(visit);
      projectVisits.set(visit.projectId, existing);
    });

    return {
      range,
      period: { from: period.from, to: period.to },
      totals: this.getTotals(visits),
      comparison: {
        totalViewsPercent: this.percentChange(
          visits.length,
          previousVisits.length,
        ),
        uniqueVisitorsPercent: this.percentChange(
          this.uniqueVisitors(visits),
          new Set(previousVisits.map((visit) => visit.visitorHash)).size,
        ),
      },
      daily: this.getDaily(visits, period.from, RANGE_DAYS[range]),
      projects: projects
        .map((project) => {
          const events = projectVisits.get(project.id) ?? [];
          const lastViewedAt = events.reduce<Date | null>(
            (latest, event) =>
              !latest || event.occurredAt > latest ? event.occurredAt : latest,
            null,
          );
          return {
            ...project,
            totalViews: events.length,
            uniqueVisitors: this.uniqueVisitors(events),
            recruiterViews: events.filter(
              (event) => event.visitorAccountType === AccountType.HIRING,
            ).length,
            lastViewedAt,
          };
        })
        .sort(
          (left, right) =>
            right.totalViews - left.totalViews ||
            left.title.localeCompare(right.title),
        ),
      referrers: this.getReferrers(visits),
    };
  }

  async getProject(
    userId: string,
    projectId: string,
    range: AnalyticsRange,
  ): Promise<AnalyticsProjectResponse> {
    const project = await this.database.project.findFirst({
      where: { id: projectId, ...this.accessibleProjectWhere(userId) },
      select: { id: true, title: true, slug: true, status: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const period = this.getPeriod(range);
    const [visits, previousVisits] = await Promise.all([
      this.database.analyticsVisit.findMany({
        where: {
          projectId,
          occurredAt: { gte: period.from, lte: period.to },
        },
        select: analyticsVisitSelect,
      }),
      this.database.analyticsVisit.findMany({
        where: {
          projectId,
          occurredAt: { gte: period.previousFrom, lt: period.from },
        },
        select: { visitorHash: true },
      }),
    ]);

    return {
      range,
      period: { from: period.from, to: period.to },
      project,
      totals: this.getTotals(visits),
      comparison: {
        totalViewsPercent: this.percentChange(
          visits.length,
          previousVisits.length,
        ),
        uniqueVisitorsPercent: this.percentChange(
          this.uniqueVisitors(visits),
          new Set(previousVisits.map((visit) => visit.visitorHash)).size,
        ),
      },
      daily: this.getDaily(visits, period.from, RANGE_DAYS[range]),
      referrers: this.getReferrers(visits),
      audience: {
        anonymous: visits.filter((visit) => !visit.visitorAccountType).length,
        recruiters: visits.filter(
          (visit) => visit.visitorAccountType === AccountType.HIRING,
        ).length,
        developers: visits.filter(
          (visit) => visit.visitorAccountType === AccountType.DEVELOPER,
        ).length,
        other: visits.filter(
          (visit) => visit.visitorAccountType === AccountType.SUPER_ADMIN,
        ).length,
      },
    };
  }

  private accessibleProjectWhere(userId: string): Prisma.ProjectWhereInput {
    return {
      OR: [
        { createdByUserId: userId },
        {
          members: {
            some: {
              userId,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
        },
      ],
    };
  }

  private async resolveTarget(input: AnalyticsTrackRequest) {
    if (input.eventType === 'PORTFOLIO_VIEW') {
      const profile = await this.database.developerProfile.findUnique({
        where: { publicSlug: input.developerSlug },
        select: { userId: true },
      });
      if (!profile) return null;
      return {
        eventType: AnalyticsEventType.PORTFOLIO_VIEW,
        targetKey: `portfolio:${profile.userId}`,
        developerUserId: profile.userId,
        projectId: null,
        memberUserIds: [] as string[],
      };
    }

    const project = await this.database.project.findFirst({
      where: { slug: input.projectSlug, status: 'PUBLISHED' },
      select: {
        id: true,
        createdByUserId: true,
        members: {
          where: { verificationStatus: VerificationStatus.VERIFIED },
          select: { userId: true },
        },
      },
    });
    if (!project) return null;
    return {
      eventType: AnalyticsEventType.PROJECT_VIEW,
      targetKey: `project:${project.id}`,
      developerUserId: project.createdByUserId,
      projectId: project.id,
      memberUserIds: project.members.flatMap((member) =>
        member.userId ? [member.userId] : [],
      ),
    };
  }

  private async getOptionalVisitor(sessionId?: string) {
    if (!sessionId) return null;
    try {
      return await this.sessionService.validateSession(sessionId);
    } catch (error) {
      this.logger.warn(
        `Analytics visitor session could not be resolved: ${error instanceof Error ? error.message : 'unknown session error'}`,
      );
      return null;
    }
  }

  private getTotals(visits: AnalyticsVisitRecord[]): AnalyticsTotals {
    return {
      totalViews: visits.length,
      uniqueVisitors: this.uniqueVisitors(visits),
      recruiterViews: visits.filter(
        (visit) => visit.visitorAccountType === AccountType.HIRING,
      ).length,
      portfolioViews: visits.filter(
        (visit) => visit.eventType === AnalyticsEventType.PORTFOLIO_VIEW,
      ).length,
      projectViews: visits.filter(
        (visit) => visit.eventType === AnalyticsEventType.PROJECT_VIEW,
      ).length,
    };
  }

  private getDaily(
    visits: AnalyticsVisitRecord[],
    from: Date,
    days: number,
  ): AnalyticsDailyPoint[] {
    const grouped = new Map<
      string,
      { views: number; visitors: Set<string>; recruiterViews: number }
    >();
    visits.forEach((visit) => {
      const key = visit.occurredAt.toISOString().slice(0, 10);
      const day = grouped.get(key) ?? {
        views: 0,
        visitors: new Set<string>(),
        recruiterViews: 0,
      };
      day.views += 1;
      day.visitors.add(visit.visitorHash);
      if (visit.visitorAccountType === AccountType.HIRING) {
        day.recruiterViews += 1;
      }
      grouped.set(key, day);
    });

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(from);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const day = grouped.get(key);
      return {
        date: key,
        totalViews: day?.views ?? 0,
        uniqueVisitors: day?.visitors.size ?? 0,
        recruiterViews: day?.recruiterViews ?? 0,
      };
    });
  }

  private getReferrers(visits: AnalyticsVisitRecord[]): AnalyticsReferrer[] {
    const counts = new Map<string, number>();
    visits.forEach((visit) => {
      const source = visit.referrerDomain;
      if (!source) return;
      counts.set(source, (counts.get(source) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([source, views]) => ({ source, views }))
      .sort((left, right) => right.views - left.views)
      .slice(0, 8);
  }

  private uniqueVisitors(visits: AnalyticsVisitRecord[]): number {
    return new Set(visits.map((visit) => visit.visitorHash)).size;
  }

  private getPeriod(range: AnalyticsRange) {
    const days = RANGE_DAYS[range];
    const to = new Date();
    const from = new Date(
      Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
    );
    from.setUTCDate(from.getUTCDate() - (days - 1));
    const previousFrom = new Date(from);
    previousFrom.setUTCDate(previousFrom.getUTCDate() - days);
    return { from, to, previousFrom };
  }

  private percentChange(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private getReferrerDomain(referrer?: string): string | null {
    if (!referrer) return null;
    try {
      const hostname = new URL(referrer).hostname
        .toLowerCase()
        .replace(/^www\./, '');
      const appHostname = process.env.APP_URL
        ? new URL(process.env.APP_URL).hostname
            .toLowerCase()
            .replace(/^www\./, '')
        : null;
      return hostname === appHostname ? null : hostname;
    } catch {
      return null;
    }
  }

  private hmac(secret: string, value: string): string {
    return createHmac('sha256', secret).update(value).digest('hex');
  }
}
