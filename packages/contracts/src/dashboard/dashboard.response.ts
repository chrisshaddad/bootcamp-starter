import { z } from 'zod';

const categoryBreakdownSchema = z.object({
  categoryId: z.uuid().nullable(),
  categoryName: z.string(),
  color: z.string().nullable(),
  amount: z.string(),
  percentage: z.number(),
});

const productContributionSchema = z.object({
  productId: z.uuid().nullable(),
  productName: z.string(),
  revenue: z.string(),
  cogs: z.string(),
  grossProfit: z.string(),
  grossMarginPct: z.number(),
});

const trendPointSchema = z.object({
  date: z.string(),
  revenue: z.string(),
  expenses: z.string(),
  netProfit: z.string(),
});

const goalProgressSchema = z.object({
  goalId: z.uuid(),
  type: z.string(),
  description: z.string().nullable(),
  targetAmount: z.string(),
  currentAmount: z.string(),
  progressPct: z.number(),
  startDate: z.string(),
  endDate: z.string(),
});

export const dashboardResponseSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  // Core metrics (all as strings — Decimal serialized)
  totalRevenue: z.string(),
  totalCogs: z.string(),
  grossProfit: z.string(),
  grossMarginPct: z.number(),
  totalExpenses: z.string(),
  netProfit: z.string(),
  netMarginPct: z.number(),
  breakEvenRevenue: z.string().nullable(),
  // Breakdowns
  expensesByCategory: z.array(categoryBreakdownSchema),
  productContributions: z.array(productContributionSchema),
  // Trend (monthly points within period)
  trend: z.array(trendPointSchema),
  // Goals
  goalProgress: z.array(goalProgressSchema),
});

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type CategoryBreakdown = z.infer<typeof categoryBreakdownSchema>;
export type ProductContribution = z.infer<typeof productContributionSchema>;
export type TrendPoint = z.infer<typeof trendPointSchema>;
export type GoalProgress = z.infer<typeof goalProgressSchema>;
