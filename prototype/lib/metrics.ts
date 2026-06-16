// All profitability figures are computed here, in code. The dashboard and the AI
// insights both consume this module — the AI never does arithmetic of its own.

import type { OrgDataset, Item, ExpenseCategory } from "./types";

export interface ItemMetric {
  item: Item;
  units: number;
  revenue: number;
  cogs: number;
  /** price - unitCost */
  contributionMarginUnit: number;
  /** (price - unitCost) * units */
  contributionMarginTotal: number;
  /** (price - unitCost) / price */
  marginPct: number;
}

export interface CategoryMetric {
  category: ExpenseCategory;
  total: number;
  pct: number;
  count: number;
}

export interface MonthPoint {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface Metrics {
  revenue: number;
  cogs: number;
  grossMargin: { amount: number; pct: number };
  totalExpenses: number;
  netMargin: { amount: number; pct: number };
  breakEven: {
    revenue: number;
    distance: number;
    covered: boolean;
    /** revenue / breakEvenRevenue, 0–1+ (for a progress bar). */
    progress: number;
  };
  itemMetrics: ItemMetric[];
  topItems: ItemMetric[];
  bottomItems: ItemMetric[];
  topPerformer: ItemMetric | null;
  leastSelling: ItemMetric | null;
  expenseByCategory: CategoryMetric[];
  topExpenseCategory: CategoryMetric | null;
  monthly: MonthPoint[];
  trends: { revenuePct: number; netMarginPct: number };
  counts: {
    items: number;
    products: number;
    services: number;
    members: number;
    expenses: number;
  };
}

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (iso: string) =>
  new Date(`${iso}-01`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

export function computeMetrics(data: OrgDataset): Metrics {
  const { items, sales, expenses, categories, members } = data;

  // Per-item aggregation
  const itemMetrics: ItemMetric[] = items.map((item) => {
    const units = sales
      .filter((s) => s.itemId === item.id)
      .reduce((sum, s) => sum + s.quantity, 0);
    const revenue = item.price * units;
    const cogs = item.unitCost * units;
    const contributionMarginUnit = item.price - item.unitCost;
    return {
      item,
      units,
      revenue,
      cogs,
      contributionMarginUnit,
      contributionMarginTotal: contributionMarginUnit * units,
      marginPct: item.price > 0 ? contributionMarginUnit / item.price : 0,
    };
  });

  const revenue = itemMetrics.reduce((s, m) => s + m.revenue, 0);
  const cogs = itemMetrics.reduce((s, m) => s + m.cogs, 0);
  const grossAmount = revenue - cogs;
  const grossPct = revenue > 0 ? grossAmount / revenue : 0;

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netAmount = grossAmount - totalExpenses;
  const netPct = revenue > 0 ? netAmount / revenue : 0;

  const breakEvenRevenue = grossPct > 0 ? totalExpenses / grossPct : 0;
  const distance = revenue - breakEvenRevenue;

  // Ranked items (only those with sales activity rank meaningfully)
  const byContribution = [...itemMetrics].sort(
    (a, b) => b.contributionMarginTotal - a.contributionMarginTotal,
  );
  const sold = itemMetrics.filter((m) => m.units > 0);
  const leastSelling =
    sold.length > 0
      ? [...sold].sort((a, b) => a.revenue - b.revenue)[0]
      : null;

  // Expenses by category
  const expenseByCategory: CategoryMetric[] = categories
    .map((category) => {
      const rows = expenses.filter((e) => e.categoryId === category.id);
      const total = rows.reduce((s, e) => s + e.amount, 0);
      return {
        category,
        total,
        count: rows.length,
        pct: totalExpenses > 0 ? total / totalExpenses : 0,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);

  // Monthly revenue vs expenses
  const monthSet = new Set<string>();
  sales.forEach((s) => monthSet.add(monthKey(s.soldAt)));
  expenses.forEach((e) => monthSet.add(monthKey(e.date)));
  const months = [...monthSet].sort();
  const itemById = new Map(items.map((i) => [i.id, i]));

  const monthly: MonthPoint[] = months.map((m) => {
    const rev = sales
      .filter((s) => monthKey(s.soldAt) === m)
      .reduce((sum, s) => sum + (itemById.get(s.itemId)?.price ?? 0) * s.quantity, 0);
    const exp = expenses
      .filter((e) => monthKey(e.date) === m)
      .reduce((sum, e) => sum + e.amount, 0);
    return { month: m, label: monthLabel(m), revenue: rev, expenses: exp, net: rev - exp };
  });

  // Trends: latest month vs previous
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const pctChange = (cur: number, before: number) =>
    before !== 0 ? (cur - before) / Math.abs(before) : 0;
  const trends = {
    revenuePct: last && prev ? pctChange(last.revenue, prev.revenue) : 0,
    netMarginPct: last && prev ? pctChange(last.net, prev.net) : 0,
  };

  return {
    revenue,
    cogs,
    grossMargin: { amount: grossAmount, pct: grossPct },
    totalExpenses,
    netMargin: { amount: netAmount, pct: netPct },
    breakEven: {
      revenue: breakEvenRevenue,
      distance,
      covered: distance >= 0,
      progress: breakEvenRevenue > 0 ? revenue / breakEvenRevenue : 0,
    },
    itemMetrics: byContribution,
    topItems: byContribution.slice(0, 5),
    bottomItems: [...sold].sort(
      (a, b) => a.contributionMarginTotal - b.contributionMarginTotal,
    ).slice(0, 5),
    topPerformer: byContribution.find((m) => m.units > 0) ?? null,
    leastSelling,
    expenseByCategory,
    topExpenseCategory: expenseByCategory[0] ?? null,
    monthly,
    trends,
    counts: {
      items: items.length,
      products: items.filter((i) => i.type === "PRODUCT").length,
      services: items.filter((i) => i.type === "SERVICE").length,
      members: members.filter((m) => m.status === "ACTIVE").length,
      expenses: expenses.length,
    },
  };
}
