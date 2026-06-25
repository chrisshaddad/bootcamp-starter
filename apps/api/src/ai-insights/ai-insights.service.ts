import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from './gemini.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AI_INSIGHTS_QUEUE, AI_INSIGHTS_JOBS } from './ai-insights.constants';
import { Prisma, type AiInsight } from '@repo/db';
import type {
  AiInsightListResponse,
  AiInsightResponse,
  AiInsightGenerateRequest,
} from '@repo/contracts';

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly dashboardService: DashboardService,
    @InjectQueue(AI_INSIGHTS_QUEUE)
    private readonly insightQueue: Queue,
  ) {}

  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number; type?: string },
  ): Promise<AiInsightListResponse> {
    const { page = 1, limit = 20, type } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };
    if (type) where.type = type;

    const [insights, total] = await Promise.all([
      this.prisma.aiInsight.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiInsight.count({ where }),
    ]);

    return {
      insights: insights.map((i) => this.toResponse(i)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Enqueue an async insight generation job.
   * Returns immediately — the client polls or the insight appears in the list.
   */
  async requestGeneration(
    organizationId: string,
    req: AiInsightGenerateRequest,
  ): Promise<{ message: string; jobId: string }> {
    const job = await this.insightQueue.add(
      AI_INSIGHTS_JOBS.GENERATE,
      {
        organizationId,
        type: req.type,
        periodStart: req.periodStart,
        periodEnd: req.periodEnd,
      },
      { attempts: 2 },
    );

    this.logger.log(
      `AI insight generation enqueued: ${job.id} for org ${organizationId}`,
    );

    return {
      message: 'Insight generation started. Check back shortly.',
      jobId: String(job.id),
    };
  }

  /**
   * Synchronous generation — called by the processor or directly for testing.
   * All metrics are computed in DashboardService (never in Gemini).
   */
  async generate(
    organizationId: string,
    type: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<AiInsightResponse> {
    // 1. Compute all metrics in code
    const dashboard = await this.dashboardService.getMetrics(organizationId, {
      dateFrom: periodStart,
      dateTo: periodEnd,
    });

    // 2. Build metrics context (pre-computed numbers sent to AI for language only)
    const metrics: Record<string, unknown> = {
      periodStart,
      periodEnd,
      totalRevenue: `$${dashboard.totalRevenue}`,
      totalCogs: `$${dashboard.totalCogs}`,
      grossProfit: `$${dashboard.grossProfit}`,
      grossMarginPct: `${dashboard.grossMarginPct.toFixed(2)}%`,
      totalExpenses: `$${dashboard.totalExpenses}`,
      netProfit: `$${dashboard.netProfit}`,
      netMarginPct: `${dashboard.netMarginPct.toFixed(2)}%`,
      breakEvenRevenue: dashboard.breakEvenRevenue
        ? `$${dashboard.breakEvenRevenue}`
        : 'N/A',
      topExpenseCategory:
        dashboard.expensesByCategory[0]?.categoryName ?? 'None',
      topExpenseCategoryAmount: `$${dashboard.expensesByCategory[0]?.amount ?? '0'}`,
      goalsMet: dashboard.goalProgress.filter((g) => g.progressPct >= 100)
        .length,
      totalGoals: dashboard.goalProgress.length,
    };

    // 3. Call AI for structured language output only
    const insight = await this.gemini.generateInsight({
      type,
      periodStart,
      periodEnd,
      metrics,
    });

    // 4. Save to DB
    const saved = await this.prisma.aiInsight.create({
      data: {
        organizationId,
        type: type as 'PROFITABILITY' | 'EXPENSE' | 'REVENUE' | 'GOAL',
        title: insight.title,
        summary: insight.summary,
        recommendations: insight.recommendations,
        metrics: metrics as Prisma.InputJsonValue,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });

    this.logger.log(`AI insight saved: ${saved.id} for org ${organizationId}`);
    return this.toResponse(saved);
  }

  private toResponse(i: AiInsight): AiInsightResponse {
    return {
      id: i.id,
      organizationId: i.organizationId,
      type: i.type,
      title: i.title,
      summary: i.summary,
      recommendations: i.recommendations as string[],
      metrics: i.metrics as Record<string, unknown>,
      periodStart:
        i.periodStart instanceof Date
          ? i.periodStart.toISOString().split('T')[0]!
          : i.periodStart,
      periodEnd:
        i.periodEnd instanceof Date
          ? i.periodEnd.toISOString().split('T')[0]!
          : i.periodEnd,
      createdAt: i.createdAt.toISOString(),
    };
  }
}
