'use client';

import { useState, useRef, useCallback } from 'react';
import { useDashboard } from '@/hooks/use-dashboard';
import { useUser } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  RefreshCw,
  Activity,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(value: string | number, compact = false): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ─── KPI card ───────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#7C4DFF',
  '#22D3EE',
  '#E879F9',
  '#34D39A',
  '#FBBF24',
  '#F4506A',
];

function KpiCard({
  title,
  value,
  sub,
  trend,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {title}
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {value}
            </p>
            {sub && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend === 'up' && 'text-[#34D39A]',
                  trend === 'down' && 'text-[#F4506A]',
                  trend === 'neutral' && 'text-muted-foreground',
                )}
              >
                {sub}
              </p>
            )}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent ?? '#7C4DFF'}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: accent ?? '#7C4DFF' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Bar chart (trend) ──────────────────────────────────────────────────────

interface BarTooltip {
  x: number;
  y: number;
  date: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

function BarChart({
  data,
}: {
  data: Array<{
    date: string;
    revenue: string;
    expenses: string;
    netProfit: string;
  }>;
}) {
  const W = 560;
  const H = 200;
  const PAD = { top: 16, right: 8, bottom: 32, left: 52 };
  const inner = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom };
  const [tooltip, setTooltip] = useState<BarTooltip | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data.length) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No trend data for this period
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(parseFloat(d.revenue), parseFloat(d.expenses))),
    1,
  );

  const barGroupW = inner.w / data.length;
  const barW = Math.min(barGroupW * 0.32, 28);
  const gap = barW * 0.5;

  const yScale = (v: number) => inner.h - (v / maxVal) * inner.h;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: maxVal * f,
    y: yScale(maxVal * f),
  }));

  const label = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    const month = new Date(parseInt(y!), parseInt(m!) - 1).toLocaleString(
      'en-US',
      { month: 'short' },
    );
    return `${month} ${y?.slice(2)}`;
  };

  const handleBarHover = (
    e: React.MouseEvent<SVGRectElement>,
    d: (typeof data)[0],
    i: number,
  ) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const cx = ((PAD.left + i * barGroupW + barGroupW / 2) / W) * rect.width;
    const rawY = e.clientY - rect.top;
    setTooltip({
      x: cx,
      y: rawY,
      date: d.date,
      revenue: parseFloat(d.revenue),
      expenses: parseFloat(d.expenses),
      netProfit: parseFloat(d.netProfit),
    });
  };

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: Math.max(W, data.length * 60) }}
        onMouseLeave={() => setTooltip(null)}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines */}
          {ticks.map(({ v, y }) => (
            <g key={v}>
              <line
                x1={0}
                x2={inner.w}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
                className="text-foreground"
              />
              <text
                x={-6}
                y={y + 4}
                textAnchor="end"
                fill="currentColor"
                fillOpacity={0.4}
                fontSize={10}
                className="text-foreground"
              >
                {fmt(v, true)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const cx = i * barGroupW + barGroupW / 2;
            const rev = parseFloat(d.revenue);
            const exp = parseFloat(d.expenses);
            const revH = (rev / maxVal) * inner.h;
            const expH = (exp / maxVal) * inner.h;
            const isHovered = tooltip?.date === d.date;

            return (
              <g key={d.date}>
                {/* Hover hit area */}
                <rect
                  x={cx - barGroupW / 2}
                  y={0}
                  width={barGroupW}
                  height={inner.h}
                  fill="transparent"
                  onMouseEnter={(e) => handleBarHover(e, d, i)}
                />
                {/* Hover highlight column */}
                {isHovered && (
                  <rect
                    x={cx - barGroupW / 2}
                    y={0}
                    width={barGroupW}
                    height={inner.h}
                    fill="currentColor"
                    fillOpacity={0.04}
                    className="text-foreground"
                  />
                )}
                {/* Revenue bar */}
                <rect
                  x={cx - barW - gap / 2}
                  y={inner.h - revH}
                  width={barW}
                  height={revH}
                  rx={3}
                  fill="#7C4DFF"
                  fillOpacity={isHovered ? 1 : 0.85}
                />
                {/* Expenses bar */}
                <rect
                  x={cx + gap / 2}
                  y={inner.h - expH}
                  width={barW}
                  height={expH}
                  rx={3}
                  fill="#22D3EE"
                  fillOpacity={isHovered ? 1 : 0.75}
                />
                {/* X label */}
                <text
                  x={cx}
                  y={inner.h + 18}
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity={isHovered ? 0.8 : 0.45}
                  fontSize={10}
                  className="text-foreground"
                >
                  {label(d.date)}
                </text>
              </g>
            );
          })}

          {/* X axis */}
          <line
            x1={0}
            x2={inner.w}
            y1={inner.h}
            y2={inner.h}
            stroke="currentColor"
            strokeOpacity={0.15}
            className="text-foreground"
          />
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[160px] rounded-lg border border-border bg-card px-3 py-2.5 shadow-xl text-xs"
          style={{
            left: Math.min(tooltip.x + 10, 400),
            top: Math.max(tooltip.y - 70, 0),
            transform: tooltip.x > 400 ? 'translateX(-110%)' : undefined,
          }}
        >
          <p className="mb-1.5 font-semibold text-foreground">
            {(() => {
              const [y, m] = tooltip.date.split('-');
              return new Date(parseInt(y!), parseInt(m!) - 1).toLocaleString(
                'en-US',
                { month: 'long', year: 'numeric' },
              );
            })()}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-[#7C4DFF]" />
                Revenue
              </span>
              <span className="font-medium tabular-nums text-foreground">
                {fmt(tooltip.revenue)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-[#22D3EE]" />
                Expenses
              </span>
              <span className="font-medium tabular-nums text-foreground">
                {fmt(tooltip.expenses)}
              </span>
            </div>
            <div className="border-t border-border pt-1 flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Net</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  tooltip.netProfit >= 0 ? 'text-[#34D39A]' : 'text-[#F4506A]',
                )}
              >
                {fmt(tooltip.netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Donut chart (expenses by category) ─────────────────────────────────────

interface DonutTooltip {
  x: number;
  y: number;
  categoryName: string;
  amount: string;
  percentage: number;
  color: string;
}

function DonutChart({
  data,
}: {
  data: Array<{
    categoryName: string;
    color: string | null;
    percentage: number;
    amount: string;
  }>;
}) {
  const R = 70;
  const CX = 90;
  const CY = 90;
  const stroke = 28;
  const [tooltip, setTooltip] = useState<DonutTooltip | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleSliceHover = useCallback(
    (
      e: React.MouseEvent,
      s: {
        categoryName: string;
        amount: string;
        percentage: number;
        color: string;
      },
      i: number,
    ) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      setHoveredIdx(i);
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        categoryName: s.categoryName,
        amount: s.amount,
        percentage: s.percentage,
        color: s.color,
      });
    },
    [],
  );

  if (!data.length) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        No expense data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.percentage, 0) || 100;
  let offset = -90;

  const slices = data.map((d, i) => {
    const angle = (d.percentage / total) * 360;
    const start = offset;
    offset += angle;
    const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
    return { ...d, angle, start, color };
  });

  const arc = (
    cx: number,
    cy: number,
    r: number,
    startDeg: number,
    endDeg: number,
  ) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy + r * Math.sin(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const hoveredSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <svg
          ref={svgRef}
          viewBox="0 0 180 180"
          className="h-[160px] w-[160px]"
          onMouseLeave={() => {
            setTooltip(null);
            setHoveredIdx(null);
          }}
        >
          {/* Background ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.07}
            strokeWidth={stroke}
            className="text-foreground"
          />
          {slices.map((s, i) => (
            <path
              key={i}
              d={arc(CX, CY, R, s.start, s.start + s.angle - 0.5)}
              fill="none"
              stroke={s.color}
              strokeWidth={hoveredIdx === i ? stroke + 6 : stroke}
              strokeLinecap="butt"
              style={{
                transition: 'stroke-width 0.15s ease',
                cursor: 'pointer',
                opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.45 : 1,
              }}
              onMouseEnter={(e) => handleSliceHover(e, s, i)}
              onMouseMove={(e) => handleSliceHover(e, s, i)}
            />
          ))}
          {/* Center label — shows hovered slice or default */}
          {hoveredSlice ? (
            <>
              <text
                x={CX}
                y={CY - 8}
                textAnchor="middle"
                fill={hoveredSlice.color}
                fontSize={9}
                fontWeight="600"
                className="pointer-events-none"
              >
                {hoveredSlice.categoryName.length > 10
                  ? hoveredSlice.categoryName.slice(0, 9) + '…'
                  : hoveredSlice.categoryName}
              </text>
              <text
                x={CX}
                y={CY + 8}
                textAnchor="middle"
                fill="currentColor"
                fontSize={11}
                fontWeight="bold"
                className="text-foreground pointer-events-none"
              >
                {hoveredSlice.percentage.toFixed(1)}%
              </text>
            </>
          ) : (
            <>
              <text
                x={CX}
                y={CY - 6}
                textAnchor="middle"
                fill="currentColor"
                fillOpacity={0.5}
                fontSize={10}
                className="text-foreground"
              >
                Total
              </text>
              <text
                x={CX}
                y={CY + 10}
                textAnchor="middle"
                fill="currentColor"
                fontSize={12}
                fontWeight="bold"
                className="text-foreground"
              >
                {data.length} cat
              </text>
            </>
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 min-w-[150px] rounded-lg border border-border bg-card px-3 py-2 shadow-xl text-xs"
            style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
          >
            <div className="flex items-center gap-1.5 mb-1 font-semibold text-foreground">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: tooltip.color }}
              />
              {tooltip.categoryName}
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium tabular-nums text-foreground">
                {fmt(tooltip.amount)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Share</span>
              <span className="font-medium tabular-nums text-foreground">
                {tooltip.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {slices.map((s, i) => (
          <li
            key={i}
            className={cn(
              'flex items-center justify-between gap-3 text-xs cursor-pointer rounded px-1 py-0.5 transition-colors',
              hoveredIdx === i ? 'bg-muted/40' : 'hover:bg-muted/20',
            )}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span
                className={cn(
                  'truncate',
                  hoveredIdx === i
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {s.categoryName}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-medium text-foreground">
                {fmt(s.amount)}
              </span>
              <span className="text-muted-foreground/60">
                ({s.percentage.toFixed(1)}%)
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useUser();
  const [dateFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dateTo] = useState<string>(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toISOString().split('T')[0]!;
  });

  const { dashboard, isLoading, mutate } = useDashboard({ dateFrom, dateTo });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-72 rounded-xl lg:col-span-3" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  const revenue = dashboard ? parseFloat(dashboard.totalRevenue) : 0;
  const grossPft = dashboard ? parseFloat(dashboard.grossProfit) : 0;
  const expenses = dashboard ? parseFloat(dashboard.totalExpenses) : 0;
  const netPft = dashboard ? parseFloat(dashboard.netProfit) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Welcome back,{' '}
            <span className="font-medium text-foreground">
              {user?.name ?? user?.email?.split('@')[0]}
            </span>{' '}
            · {dateFrom} → {dateTo}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="gap-2 border-border bg-card text-foreground hover:bg-secondary"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={fmt(revenue)}
          sub={
            dashboard
              ? `${dashboard.grossMarginPct.toFixed(1)}% gross margin`
              : undefined
          }
          trend={revenue >= 0 ? 'up' : 'down'}
          icon={DollarSign}
          accent="#7C4DFF"
        />
        <KpiCard
          title="Gross Profit"
          value={fmt(grossPft)}
          sub={
            dashboard ? `${pct(dashboard.grossMarginPct)} margin` : undefined
          }
          trend={grossPft >= 0 ? 'up' : 'down'}
          icon={TrendingUp}
          accent="#34D39A"
        />
        <KpiCard
          title="Total Expenses"
          value={fmt(expenses)}
          sub={
            dashboard && revenue > 0
              ? `${((expenses / revenue) * 100).toFixed(1)}% of revenue`
              : 'No revenue data'
          }
          trend="neutral"
          icon={TrendingDown}
          accent="#FBBF24"
        />
        <KpiCard
          title="Net Profit"
          value={fmt(netPft)}
          sub={
            dashboard
              ? `${dashboard.netMarginPct.toFixed(1)}% net margin`
              : undefined
          }
          trend={netPft >= 0 ? 'up' : 'down'}
          icon={Activity}
          accent={netPft >= 0 ? '#34D39A' : '#F4506A'}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Bar chart — Revenue vs Expenses trend */}
        <Card className="border-border bg-card shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Revenue vs Expenses
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#7C4DFF]" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#22D3EE]" />
                  Expenses
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <BarChart data={dashboard?.trend ?? []} />
          </CardContent>
        </Card>

        {/* Donut — Expense breakdown */}
        <Card className="border-border bg-card shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DonutChart data={dashboard?.expensesByCategory ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Goal Progress */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Goal Progress
              </CardTitle>
              <a href="/goals" className="text-xs text-primary hover:underline">
                Manage →
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {!dashboard?.goalProgress.length ? (
              <div className="space-y-1.5 py-4 text-center">
                <Target className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No active goals</p>
                <a
                  href="/goals"
                  className="text-xs text-primary hover:underline"
                >
                  Set a goal →
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.goalProgress.map((g) => {
                  const pctVal = Math.min(g.progressPct, 100);
                  const isExpLimit = g.type === 'EXPENSE_LIMIT';
                  const isOver = g.progressPct > 100;
                  const barColor =
                    isExpLimit && isOver
                      ? '#F4506A'
                      : isExpLimit
                        ? '#FBBF24'
                        : pctVal >= 100
                          ? '#34D39A'
                          : '#7C4DFF';

                  return (
                    <div key={g.goalId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {g.type.replace(/_/g, ' ')}
                          </span>
                          {isOver && (
                            <Badge
                              variant={isExpLimit ? 'destructive' : 'default'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {isExpLimit ? 'Over limit' : 'Goal met!'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {fmt(g.currentAmount)} / {fmt(g.targetAmount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${pctVal}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground/60">
                        {g.progressPct.toFixed(1)}% — {g.startDate} to{' '}
                        {g.endDate}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product margins table */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Product Margins
                </span>
              </CardTitle>
              <a
                href="/products"
                className="text-xs text-primary hover:underline"
              >
                All products →
              </a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!dashboard?.productContributions.length ? (
              <div className="py-6 text-center text-sm text-muted-foreground px-5">
                Add products and record sales to see margin data.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pl-5 pr-3 pt-0 text-left font-medium text-muted-foreground/60 uppercase tracking-wider text-[10px]">
                      Product
                    </th>
                    <th className="pb-2 pr-3 pt-0 text-right font-medium text-muted-foreground/60 uppercase tracking-wider text-[10px]">
                      Revenue
                    </th>
                    <th className="pb-2 pr-5 pt-0 text-right font-medium text-muted-foreground/60 uppercase tracking-wider text-[10px]">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboard.productContributions.slice(0, 6).map((p) => (
                    <tr
                      key={p.productId ?? 'direct'}
                      className="hover:bg-muted/20"
                    >
                      <td className="py-2.5 pl-5 pr-3 font-medium text-foreground truncate max-w-[140px]">
                        {p.productName}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                        {fmt(p.revenue, true)}
                      </td>
                      <td className="py-2.5 pr-5 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            p.grossMarginPct >= 40
                              ? 'bg-[#34D39A]/15 text-[#34D39A]'
                              : p.grossMarginPct >= 20
                                ? 'bg-[#FBBF24]/15 text-[#FBBF24]'
                                : 'bg-[#F4506A]/15 text-[#F4506A]',
                          )}
                        >
                          {p.grossMarginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Break-even callout ── */}
      {dashboard?.breakEvenRevenue && (
        <Card className="border-[#FBBF24]/20 bg-[#FBBF24]/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FBBF24]/15">
              <Target className="h-4 w-4 text-[#FBBF24]" />
            </div>
            <p className="text-sm text-foreground">
              <span className="font-semibold">Break-even point:</span>{' '}
              <span className="text-[#FBBF24] font-medium">
                {fmt(dashboard.breakEvenRevenue)}
              </span>{' '}
              revenue needed to cover all expenses at your current{' '}
              <span className="font-medium">
                {dashboard.grossMarginPct.toFixed(1)}%
              </span>{' '}
              gross margin.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
