import { z } from 'zod';

// Core P&L summary for the reporting period. Monetary values are Decimal
// serialized as strings; percentages are plain numbers.
const reportSummarySchema = z.object({
  totalRevenue: z.string(),
  totalCogs: z.string(),
  grossProfit: z.string(),
  grossMarginPct: z.number(),
  totalExpenses: z.string(),
  netProfit: z.string(),
  netMarginPct: z.number(),
  breakEvenRevenue: z.string().nullable(),
  salesCount: z.number().int(),
  expenseCount: z.number().int(),
  avgOrderValue: z.string(),
});

// Month-over-month comparison against the previous calendar month. Change
// percentages are null when the previous month had a zero baseline.
const reportComparisonSchema = z.object({
  prevLabel: z.string(),
  prevRevenue: z.string(),
  prevExpenses: z.string(),
  prevNetProfit: z.string(),
  revenueChangePct: z.number().nullable(),
  expenseChangePct: z.number().nullable(),
  netProfitChangePct: z.number().nullable(),
});

const reportCategorySchema = z.object({
  categoryId: z.uuid().nullable(),
  categoryName: z.string(),
  color: z.string().nullable(),
  amount: z.string(),
  percentage: z.number(),
});

const reportProductSchema = z.object({
  productId: z.uuid().nullable(),
  productName: z.string(),
  revenue: z.string(),
  cogs: z.string(),
  grossProfit: z.string(),
  grossMarginPct: z.number(),
});

// One point per day within the month for the trend chart.
const reportDailyPointSchema = z.object({
  date: z.string(),
  revenue: z.string(),
  expenses: z.string(),
  netProfit: z.string(),
});

const reportLineItemSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  category: z.string().nullable(),
  date: z.string(),
  amount: z.string(),
});

const reportGoalSchema = z.object({
  goalId: z.uuid(),
  type: z.string(),
  description: z.string().nullable(),
  targetAmount: z.string(),
  currentAmount: z.string(),
  progressPct: z.number(),
  startDate: z.string(),
  endDate: z.string(),
});

const reportInsightSchema = z.object({
  id: z.uuid(),
  type: z.string(),
  title: z.string(),
  summary: z.string(),
  recommendations: z.array(z.string()),
  periodStart: z.string(),
  periodEnd: z.string(),
  createdAt: z.string(),
});

export const monthlyReportResponseSchema = z.object({
  // 'MONTHLY' for a calendar-month report, 'RANGE' for a custom date range.
  type: z.enum(['MONTHLY', 'RANGE']),
  // Only meaningful for monthly reports; omitted for custom ranges.
  year: z.number().int().optional(),
  month: z.number().int().optional(),
  label: z.string(), // e.g. "July 2026" or "Jun 1 – Jul 11, 2026"
  periodStart: z.string(),
  periodEnd: z.string(),
  organizationName: z.string(),
  generatedAt: z.string(),
  hasData: z.boolean(),
  // Plain-language sections — always populated, no AI required.
  narrative: z.array(z.string()),
  highlights: z.array(z.string()),
  // Metrics + breakdowns.
  summary: reportSummarySchema,
  comparison: reportComparisonSchema.nullable(),
  expensesByCategory: z.array(reportCategorySchema),
  productContributions: z.array(reportProductSchema),
  dailyTrend: z.array(reportDailyPointSchema),
  topSales: z.array(reportLineItemSchema),
  topExpenses: z.array(reportLineItemSchema),
  goals: z.array(reportGoalSchema),
  // Any AI insights whose period overlaps this month.
  insights: z.array(reportInsightSchema),
});

export type MonthlyReportResponse = z.infer<typeof monthlyReportResponseSchema>;
export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type ReportComparison = z.infer<typeof reportComparisonSchema>;
export type ReportCategory = z.infer<typeof reportCategorySchema>;
export type ReportProduct = z.infer<typeof reportProductSchema>;
export type ReportDailyPoint = z.infer<typeof reportDailyPointSchema>;
export type ReportLineItem = z.infer<typeof reportLineItemSchema>;
export type ReportGoal = z.infer<typeof reportGoalSchema>;
export type ReportInsight = z.infer<typeof reportInsightSchema>;
