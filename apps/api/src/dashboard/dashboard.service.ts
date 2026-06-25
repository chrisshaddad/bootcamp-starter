import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { DashboardResponse, DashboardQuery } from '@repo/contracts';
import type { Expense, Sale } from '@repo/db';

/**
 * All arithmetic is done in TypeScript (never delegated to AI).
 * Decimal fields come from Prisma as Decimal objects — convert via .toString()
 * before arithmetic to avoid floating-point drift.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(
    organizationId: string,
    query: DashboardQuery,
  ): Promise<DashboardResponse> {
    // Default: current month
    const now = new Date();
    const periodStart = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = query.dateTo
      ? new Date(query.dateTo)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [expenses, sales, goals] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          organizationId,
          date: { gte: periodStart, lte: periodEnd },
        },
        include: { category: true },
      }),
      this.prisma.sale.findMany({
        where: {
          organizationId,
          date: { gte: periodStart, lte: periodEnd },
        },
        include: { product: true },
      }),
      this.prisma.goal.findMany({
        where: { organizationId, isActive: true },
      }),
    ]);

    // ---- Core metrics ----
    const totalRevenue = sales.reduce((acc, s) => {
      const qty = parseFloat(s.quantity.toString());
      const price = parseFloat(s.unitPrice.toString());
      return acc + qty * price;
    }, 0);

    const totalCogs = sales.reduce((acc, s) => {
      const qty = parseFloat(s.quantity.toString());
      const cost = s.unitCost ? parseFloat(s.unitCost.toString()) : 0;
      return acc + qty * cost;
    }, 0);

    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPct =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const totalExpenses = expenses.reduce(
      (acc, e) => acc + parseFloat(e.amount.toString()),
      0,
    );

    const netProfit = grossProfit - totalExpenses;
    const netMarginPct =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Break-even: totalExpenses / grossMarginPct (if gm > 0)
    const breakEvenRevenue =
      grossMarginPct > 0
        ? ((totalExpenses / grossMarginPct) * 100).toFixed(2)
        : null;

    // ---- Expense breakdown by category ----
    const categoryMap = new Map<
      string,
      { name: string; color: string | null; total: number }
    >();

    for (const e of expenses) {
      const key = e.categoryId ?? 'uncategorized';
      const name = e.category?.name ?? 'Uncategorized';
      const color = e.category?.color ?? '#6b7280';
      const amount = parseFloat(e.amount.toString());
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += amount;
      } else {
        categoryMap.set(key, { name, color, total: amount });
      }
    }

    const expensesByCategory = Array.from(categoryMap.entries()).map(
      ([key, val]) => ({
        categoryId: key === 'uncategorized' ? null : key,
        categoryName: val.name,
        color: val.color,
        amount: val.total.toFixed(2),
        percentage:
          totalExpenses > 0
            ? parseFloat(((val.total / totalExpenses) * 100).toFixed(2))
            : 0,
      }),
    );

    // ---- Per-product contribution margin ----
    const productMap = new Map<
      string,
      { name: string; revenue: number; cogs: number }
    >();

    for (const s of sales) {
      const key = s.productId ?? 'no-product';
      const name = s.product?.name ?? 'Direct Sale';
      const qty = parseFloat(s.quantity.toString());
      const price = parseFloat(s.unitPrice.toString());
      const cost = s.unitCost ? parseFloat(s.unitCost.toString()) : 0;
      const rev = qty * price;
      const cogs = qty * cost;
      const existing = productMap.get(key);
      if (existing) {
        existing.revenue += rev;
        existing.cogs += cogs;
      } else {
        productMap.set(key, { name, revenue: rev, cogs });
      }
    }

    const productContributions = Array.from(productMap.entries()).map(
      ([key, val]) => {
        const gp = val.revenue - val.cogs;
        return {
          productId: key === 'no-product' ? null : key,
          productName: val.name,
          revenue: val.revenue.toFixed(2),
          cogs: val.cogs.toFixed(2),
          grossProfit: gp.toFixed(2),
          grossMarginPct:
            val.revenue > 0
              ? parseFloat(((gp / val.revenue) * 100).toFixed(2))
              : 0,
        };
      },
    );

    // ---- Monthly trend within period ----
    const trend = this.buildTrend(expenses, sales, periodStart, periodEnd);

    // ---- Goal progress ----
    const goalProgress = goals.map((g) => {
      const current = this.computeGoalCurrent(
        g.type as string,
        totalRevenue,
        grossProfit,
        netProfit,
        totalExpenses,
      );
      const target = parseFloat(g.targetAmount.toString());
      const pct =
        g.type === 'EXPENSE_LIMIT'
          ? target > 0
            ? parseFloat(((current / target) * 100).toFixed(2))
            : 0
          : target > 0
            ? parseFloat(((current / target) * 100).toFixed(2))
            : 0;

      return {
        goalId: g.id,
        type: g.type,
        description: g.description,
        targetAmount: target.toFixed(2),
        currentAmount: current.toFixed(2),
        progressPct: pct,
        startDate:
          g.startDate instanceof Date
            ? g.startDate.toISOString().split('T')[0]!
            : g.startDate,
        endDate:
          g.endDate instanceof Date
            ? g.endDate.toISOString().split('T')[0]!
            : g.endDate,
      };
    });

    return {
      periodStart: periodStart.toISOString().split('T')[0]!,
      periodEnd: periodEnd.toISOString().split('T')[0]!,
      totalRevenue: totalRevenue.toFixed(2),
      totalCogs: totalCogs.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      grossMarginPct: parseFloat(grossMarginPct.toFixed(2)),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: netProfit.toFixed(2),
      netMarginPct: parseFloat(netMarginPct.toFixed(2)),
      breakEvenRevenue,
      expensesByCategory,
      productContributions,
      trend,
      goalProgress,
    };
  }

  private buildTrend(
    expenses: Expense[],
    sales: Sale[],
    start: Date,
    end: Date,
  ) {
    // Group by month label (YYYY-MM)
    const map = new Map<
      string,
      { revenue: number; expenses: number; cogs: number }
    >();

    const key = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    for (const s of sales) {
      const k = key(s.date instanceof Date ? s.date : new Date(s.date));
      const qty = parseFloat(s.quantity.toString());
      const price = parseFloat(s.unitPrice.toString());
      const cost = s.unitCost ? parseFloat(s.unitCost.toString()) : 0;
      const entry = map.get(k) ?? { revenue: 0, expenses: 0, cogs: 0 };
      entry.revenue += qty * price;
      entry.cogs += qty * cost;
      map.set(k, entry);
    }

    for (const e of expenses) {
      const k = key(e.date instanceof Date ? e.date : new Date(e.date));
      const amount = parseFloat(e.amount.toString());
      const entry = map.get(k) ?? { revenue: 0, expenses: 0, cogs: 0 };
      entry.expenses += amount;
      map.set(k, entry);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        revenue: val.revenue.toFixed(2),
        expenses: val.expenses.toFixed(2),
        netProfit: (val.revenue - val.cogs - val.expenses).toFixed(2),
      }));
  }

  private computeGoalCurrent(
    type: string,
    revenue: number,
    grossProfit: number,
    netProfit: number,
    expenses: number,
  ): number {
    switch (type) {
      case 'REVENUE':
        return revenue;
      case 'GROSS_PROFIT':
        return grossProfit;
      case 'NET_PROFIT':
        return netProfit;
      case 'EXPENSE_LIMIT':
        return expenses;
      default:
        return 0;
    }
  }
}
