import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import type {
  ReportQuery,
  ReportRangeQuery,
  ReportType,
  MonthlyReportResponse,
  ReportComparison,
  ReportLineItem,
  ReportInsight,
} from '@repo/contracts';
import type { AiInsight, Expense, Sale } from '@repo/db';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_MS = 86_400_000;

// Beyond this many days the trend is bucketed by month instead of by day so the
// chart stays readable.
const DAILY_TREND_MAX_DAYS = 120;

interface ReportWindow {
  type: ReportType;
  label: string;
  startStr: string;
  endStr: string;
  prevStartStr: string;
  prevEndStr: string;
  prevLabel: string;
  year?: number;
  month?: number;
}

/**
 * Assembles a fully detailed report by reusing DashboardService for the core
 * P&L (so numbers always match the dashboard) and layering on
 * period-over-period comparison, per-day trend, top line items, goals, AI
 * insights and a plain-language narrative. Supports both a calendar month and
 * an arbitrary date range.
 *
 * All arithmetic is done here in TypeScript — Decimal fields are converted via
 * .toString() before math to avoid floating-point drift.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  /** Calendar-month report; compares against the previous calendar month. */
  async getMonthlyReport(
    organizationId: string,
    query: ReportQuery,
  ): Promise<MonthlyReportResponse> {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1; // 1-based

    const { startStr, endStr } = this.monthRange(year, month);
    const prev =
      month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    const prevRange = this.monthRange(prev.y, prev.m);

    return this.buildReport(organizationId, {
      type: 'MONTHLY',
      year,
      month,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      startStr,
      endStr,
      prevStartStr: prevRange.startStr,
      prevEndStr: prevRange.endStr,
      prevLabel: `${MONTH_NAMES[prev.m - 1]} ${prev.y}`,
    });
  }

  /**
   * Custom date-range report; compares against the immediately preceding window
   * of the same length.
   */
  async getRangeReport(
    organizationId: string,
    query: ReportRangeQuery,
  ): Promise<MonthlyReportResponse> {
    const startStr = query.dateFrom;
    const endStr = query.dateTo;
    const start = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T00:00:00.000Z`);

    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }

    const days = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
    const prevEnd = new Date(start.getTime() - DAY_MS);
    const prevStart = new Date(prevEnd.getTime() - (days - 1) * DAY_MS);
    const prevStartStr = this.dayKey(prevStart);
    const prevEndStr = this.dayKey(prevEnd);

    return this.buildReport(organizationId, {
      type: 'RANGE',
      label: this.rangeLabel(startStr, endStr),
      startStr,
      endStr,
      prevStartStr,
      prevEndStr,
      prevLabel: this.rangeLabel(prevStartStr, prevEndStr),
    });
  }

  // ---- core builder -------------------------------------------------------

  private async buildReport(
    organizationId: string,
    window: ReportWindow,
  ): Promise<MonthlyReportResponse> {
    const {
      type,
      label,
      startStr,
      endStr,
      prevStartStr,
      prevEndStr,
      prevLabel,
      year,
      month,
    } = window;

    const [metrics, prevMetrics, sales, expenses, org, insights] =
      await Promise.all([
        this.dashboard.getMetrics(organizationId, {
          dateFrom: startStr,
          dateTo: endStr,
        }),
        this.dashboard.getMetrics(organizationId, {
          dateFrom: prevStartStr,
          dateTo: prevEndStr,
        }),
        this.prisma.sale.findMany({
          where: {
            organizationId,
            date: { gte: new Date(startStr), lte: new Date(endStr) },
          },
          include: { product: true },
        }),
        this.prisma.expense.findMany({
          where: {
            organizationId,
            date: { gte: new Date(startStr), lte: new Date(endStr) },
          },
          include: { category: true },
        }),
        this.prisma.organization.findFirst({
          where: { id: organizationId },
          select: { name: true },
        }),
        this.prisma.aiInsight.findMany({
          where: {
            organizationId,
            // Any insight whose period overlaps this window.
            periodStart: { lte: new Date(endStr) },
            periodEnd: { gte: new Date(startStr) },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const salesCount = sales.length;
    const expenseCount = expenses.length;
    const totalRevenue = parseFloat(metrics.totalRevenue);
    const avgOrderValue =
      salesCount > 0 ? (totalRevenue / salesCount).toFixed(2) : '0.00';

    const comparison = this.buildComparison(metrics, prevMetrics, prevLabel);
    const dailyTrend = this.buildTrend(sales, expenses, startStr, endStr);
    const topSales = this.buildTopSales(sales);
    const topExpenses = this.buildTopExpenses(expenses);
    const hasData = salesCount > 0 || expenseCount > 0;

    const summary = {
      totalRevenue: metrics.totalRevenue,
      totalCogs: metrics.totalCogs,
      grossProfit: metrics.grossProfit,
      grossMarginPct: metrics.grossMarginPct,
      totalExpenses: metrics.totalExpenses,
      netProfit: metrics.netProfit,
      netMarginPct: metrics.netMarginPct,
      breakEvenRevenue: metrics.breakEvenRevenue,
      salesCount,
      expenseCount,
      avgOrderValue,
    };

    const { narrative, highlights } = this.buildNarrative({
      label,
      orgName: org.name,
      metrics,
      summary,
      comparison,
    });

    return {
      type,
      year,
      month,
      label,
      periodStart: startStr,
      periodEnd: endStr,
      organizationName: org.name,
      generatedAt: new Date().toISOString(),
      hasData,
      narrative,
      highlights,
      summary,
      comparison,
      expensesByCategory: metrics.expensesByCategory,
      productContributions: metrics.productContributions,
      dailyTrend,
      topSales,
      topExpenses,
      goals: metrics.goalProgress,
      insights: insights.map((i) => this.toInsight(i)),
    };
  }

  // ---- helpers ------------------------------------------------------------

  private monthRange(
    year: number,
    month: number,
  ): { startStr: string; endStr: string } {
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    return { startStr: `${year}-${mm}-01`, endStr: `${year}-${mm}-${dd}` };
  }

  private rangeLabel(startStr: string, endStr: string): string {
    const s = new Date(`${startStr}T00:00:00.000Z`);
    const e = new Date(`${endStr}T00:00:00.000Z`);
    const fmt = (d: Date, withYear: boolean): string => {
      const opts: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      };
      if (withYear) opts.year = 'numeric';
      return d.toLocaleDateString('en-US', opts);
    };
    const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
    return `${fmt(s, !sameYear)} – ${fmt(e, true)}`;
  }

  private pctChange(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  }

  private buildComparison(
    metrics: Awaited<ReturnType<DashboardService['getMetrics']>>,
    prevMetrics: Awaited<ReturnType<DashboardService['getMetrics']>>,
    prevLabel: string,
  ): ReportComparison {
    const revenue = parseFloat(metrics.totalRevenue);
    const expenses = parseFloat(metrics.totalExpenses);
    const netProfit = parseFloat(metrics.netProfit);
    const prevRevenue = parseFloat(prevMetrics.totalRevenue);
    const prevExpenses = parseFloat(prevMetrics.totalExpenses);
    const prevNetProfit = parseFloat(prevMetrics.netProfit);

    return {
      prevLabel,
      prevRevenue: prevMetrics.totalRevenue,
      prevExpenses: prevMetrics.totalExpenses,
      prevNetProfit: prevMetrics.netProfit,
      revenueChangePct: this.pctChange(revenue, prevRevenue),
      expenseChangePct: this.pctChange(expenses, prevExpenses),
      netProfitChangePct: this.pctChange(netProfit, prevNetProfit),
    };
  }

  /**
   * Revenue/expense/net trend across the window. Buckets by day for shorter
   * windows and by month once the window exceeds DAILY_TREND_MAX_DAYS. Empty
   * buckets are included so the chart shows a continuous timeline.
   */
  private buildTrend(
    sales: Sale[],
    expenses: Expense[],
    startStr: string,
    endStr: string,
  ): MonthlyReportResponse['dailyTrend'] {
    const start = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T00:00:00.000Z`);
    const totalDays =
      Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
    const monthly = totalDays > DAILY_TREND_MAX_DAYS;

    const map = new Map<
      string,
      { revenue: number; cogs: number; expenses: number }
    >();
    const order: string[] = [];

    if (monthly) {
      const cursor = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
      );
      while (cursor.getTime() <= end.getTime()) {
        const key = this.monthKey(cursor);
        map.set(key, { revenue: 0, cogs: 0, expenses: 0 });
        order.push(key);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } else {
      const cursor = new Date(start);
      while (cursor.getTime() <= end.getTime()) {
        const key = this.dayKey(cursor);
        map.set(key, { revenue: 0, cogs: 0, expenses: 0 });
        order.push(key);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    const bucketKey = (value: Date) => {
      const d = value instanceof Date ? value : new Date(value);
      return monthly ? this.monthKey(d) : this.dayKey(d);
    };

    for (const s of sales) {
      const entry = map.get(bucketKey(s.date));
      if (!entry) continue;
      const qty = parseFloat(s.quantity.toString());
      const price = parseFloat(s.unitPrice.toString());
      const cost = s.unitCost ? parseFloat(s.unitCost.toString()) : 0;
      entry.revenue += qty * price;
      entry.cogs += qty * cost;
    }

    for (const e of expenses) {
      const entry = map.get(bucketKey(e.date));
      if (!entry) continue;
      entry.expenses += parseFloat(e.amount.toString());
    }

    return order.map((key) => {
      const val = map.get(key)!;
      return {
        date: key,
        revenue: val.revenue.toFixed(2),
        expenses: val.expenses.toFixed(2),
        netProfit: (val.revenue - val.cogs - val.expenses).toFixed(2),
      };
    });
  }

  private dayKey(value: Date): string {
    const d = value instanceof Date ? value : new Date(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private monthKey(value: Date): string {
    const d = value instanceof Date ? value : new Date(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }

  private buildTopSales(
    sales: (Sale & { product: { name: string } | null })[],
  ): ReportLineItem[] {
    return sales
      .map((s) => {
        const qty = parseFloat(s.quantity.toString());
        const price = parseFloat(s.unitPrice.toString());
        return {
          item: {
            id: s.id,
            label: s.description ?? s.product?.name ?? 'Direct sale',
            category: s.product?.name ?? null,
            date: this.dateStr(s.date),
            amount: (qty * price).toFixed(2),
          },
          value: qty * price,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((entry) => entry.item);
  }

  private buildTopExpenses(
    expenses: (Expense & { category: { name: string } | null })[],
  ): ReportLineItem[] {
    return expenses
      .map((e) => {
        const value = parseFloat(e.amount.toString());
        return {
          item: {
            id: e.id,
            label: e.description,
            category: e.category?.name ?? null,
            date: this.dateStr(e.date),
            amount: value.toFixed(2),
          },
          value,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((entry) => entry.item);
  }

  private dateStr(value: Date): string {
    const d = value instanceof Date ? value : new Date(value);
    return d.toISOString().split('T')[0]!;
  }

  private toInsight(i: AiInsight): ReportInsight {
    return {
      id: i.id,
      type: i.type,
      title: i.title,
      summary: i.summary,
      recommendations: i.recommendations as string[],
      periodStart: this.dateStr(i.periodStart),
      periodEnd: this.dateStr(i.periodEnd),
      createdAt: i.createdAt.toISOString(),
    };
  }

  private money(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Deterministic, human-readable summary generated straight from the numbers.
   * No AI call — the report always has readable prose even without a GEMINI key.
   */
  private buildNarrative(ctx: {
    label: string;
    orgName: string;
    metrics: Awaited<ReturnType<DashboardService['getMetrics']>>;
    summary: MonthlyReportResponse['summary'];
    comparison: ReportComparison;
  }): { narrative: string[]; highlights: string[] } {
    const { label, orgName, summary, comparison } = ctx;
    const netProfit = parseFloat(summary.netProfit);
    const narrative: string[] = [];

    // 1. Overview
    if (summary.salesCount === 0 && summary.expenseCount === 0) {
      narrative.push(
        `No sales or expenses were recorded for ${orgName} during ${label}. Once you add sales and expenses for this period, this report will summarise revenue, profitability and spending automatically.`,
      );
      return { narrative, highlights: [] };
    }

    narrative.push(
      `During ${label}, ${orgName} generated ${this.money(summary.totalRevenue)} in revenue across ${summary.salesCount} ` +
        `${summary.salesCount === 1 ? 'sale' : 'sales'} (an average of ${this.money(summary.avgOrderValue)} per sale), ` +
        `while recording ${this.money(summary.totalExpenses)} in operating expenses across ${summary.expenseCount} ` +
        `${summary.expenseCount === 1 ? 'entry' : 'entries'}.`,
    );

    // 2. Profitability
    const profitWord = netProfit >= 0 ? 'a net profit' : 'a net loss';
    narrative.push(
      `After ${this.money(summary.totalCogs)} in cost of goods sold, gross profit was ${this.money(summary.grossProfit)} ` +
        `(a ${summary.grossMarginPct.toFixed(1)}% gross margin). Once operating expenses are subtracted, the business ended the period with ` +
        `${profitWord} of ${this.money(Math.abs(netProfit))} — a ${summary.netMarginPct.toFixed(1)}% net margin.`,
    );

    // 3. Expenses / break-even
    const topCat = ctx.metrics.expensesByCategory[0];
    if (topCat) {
      narrative.push(
        `The largest area of spend was ${topCat.categoryName}, accounting for ${this.money(topCat.amount)} ` +
          `(${topCat.percentage.toFixed(1)}% of total expenses).` +
          (summary.breakEvenRevenue
            ? ` At the current gross margin, roughly ${this.money(summary.breakEvenRevenue)} of revenue is needed to break even.`
            : ''),
      );
    }

    // 4. Period-over-period
    if (comparison.revenueChangePct !== null) {
      const dir = comparison.revenueChangePct >= 0 ? 'up' : 'down';
      narrative.push(
        `Compared with ${comparison.prevLabel}, revenue was ${dir} ${Math.abs(comparison.revenueChangePct).toFixed(1)}% ` +
          `(from ${this.money(comparison.prevRevenue)} to ${this.money(summary.totalRevenue)}).`,
      );
    }

    // Highlights (short bullets)
    const highlights: string[] = [];
    highlights.push(`Revenue: ${this.money(summary.totalRevenue)}`);
    highlights.push(
      `Net ${netProfit >= 0 ? 'profit' : 'loss'}: ${this.money(Math.abs(netProfit))} (${summary.netMarginPct.toFixed(1)}% margin)`,
    );
    if (comparison.revenueChangePct !== null) {
      highlights.push(
        `Revenue ${comparison.revenueChangePct >= 0 ? '+' : ''}${comparison.revenueChangePct.toFixed(1)}% vs ${comparison.prevLabel}`,
      );
    }
    if (topCat) {
      highlights.push(
        `Top expense: ${topCat.categoryName} (${topCat.percentage.toFixed(1)}%)`,
      );
    }
    const goalsMet = ctx.metrics.goalProgress.filter(
      (g) => g.progressPct >= 100,
    ).length;
    if (ctx.metrics.goalProgress.length > 0) {
      highlights.push(
        `Goals met: ${goalsMet} of ${ctx.metrics.goalProgress.length}`,
      );
    }

    return { narrative, highlights };
  }
}
