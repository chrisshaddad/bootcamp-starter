"use client";

import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { computeMetrics, type ItemMetric } from "@/lib/metrics";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { ItemTypeBadge } from "@/components/app/badges";
import { RevenueExpenseChart } from "@/components/app/charts/revenue-expense-chart";
import { ExpenseDonut } from "@/components/app/charts/expense-donut";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function RankRow({ rank, m }: { rank: number; m: ItemMetric }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-4 text-sm font-medium tabular-nums text-muted-foreground">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {m.item.name}
          </span>
          <ItemTypeBadge type={m.item.type} />
        </div>
        <span className="text-xs text-muted-foreground">
          {formatNumber(m.units)} sold · {formatPercent(m.marginPct, 0)} margin
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {formatCurrency(m.contributionMarginTotal)}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { orgData } = useStore();
  if (!orgData) return null;
  const m = computeMetrics(orgData);

  const chartData = m.monthly.map((p) => ({
    label: p.label.split(" ")[0],
    revenue: p.revenue,
    expenses: p.expenses,
  }));
  const donutData = m.expenseByCategory.map((c) => ({
    name: c.category.name,
    value: c.total,
    color: c.category.color,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Profitability for ${orgData.organization.name} · last 3 months`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatCurrency(m.revenue)}
          icon={DollarSign}
          trend={{ value: m.trends.revenuePct }}
          sub="vs. previous month"
        />
        <StatCard
          label="Gross margin"
          value={formatPercent(m.grossMargin.pct)}
          icon={TrendingUp}
          sub={`${formatCurrency(m.grossMargin.amount)} after cost of goods`}
        />
        <StatCard
          label="Net margin"
          value={formatPercent(m.netMargin.pct)}
          icon={Wallet}
          trend={{ value: m.trends.netMarginPct }}
          sub={`${formatCurrency(m.netMargin.amount)} after all expenses`}
        />
        <StatCard
          label="Break-even"
          value={formatCurrency(m.breakEven.revenue)}
          icon={Target}
          sub={
            <span className={m.breakEven.covered ? "text-success" : "text-error"}>
              {m.breakEven.covered
                ? `${formatCurrency(m.breakEven.distance)} above break-even`
                : `${formatCurrency(Math.abs(m.breakEven.distance))} short`}
            </span>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs. expenses</CardTitle>
            <CardDescription>Monthly, last 3 months</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueExpenseChart data={chartData} />
            <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-chart-1" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-chart-3" /> Expenses
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense breakdown</CardTitle>
            <CardDescription>{formatCurrency(m.totalExpenses)} total</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseDonut data={donutData} />
            <div className="mt-2 space-y-1.5">
              {m.expenseByCategory.slice(0, 4).map((c) => (
                <div key={c.category.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: c.category.color }}
                  />
                  <span className="text-muted-foreground">{c.category.name}</span>
                  <span className="ml-auto font-medium tabular-nums text-foreground">
                    {formatPercent(c.pct, 0)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item rankings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top performers</CardTitle>
            <CardDescription>By total contribution margin</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {m.topItems.map((it, i) => (
              <RankRow key={it.item.id} rank={i + 1} m={it} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Lowest contributors to margin</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {m.bottomItems.map((it, i) => (
              <RankRow key={it.item.id} rank={i + 1} m={it} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI teaser */}
      <Card className="overflow-hidden border-primary-base/30 bg-gradient-to-br from-primary-soft/60 to-card">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">Ask Margin AI</p>
              <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
                {m.topExpenseCategory
                  ? `${m.topExpenseCategory.category.name} is ${formatPercent(
                      m.topExpenseCategory.pct,
                      0,
                    )} of your spend. `
                  : ""}
                Get specific recommendations tied to your real numbers.
              </p>
            </div>
          </div>
          <Button render={<Link href="/insights" />} className="shrink-0">
            Open AI insights
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
