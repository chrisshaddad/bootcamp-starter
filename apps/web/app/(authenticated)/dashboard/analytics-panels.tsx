'use client';

import { useId, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CheckInTrendPoint, PlanBreakdownItem } from '@repo/contracts';

// Fixed categorical order (garnet/blue/amber/green/violet), validated
// colorblind-safe via the dataviz skill's validate_palette.js against both
// the light and dark chart surface — see the comment in globals.css.
// chart-1 doubles as the single-series trend color, so it stays the brand
// anchor everywhere on this dashboard.
const PLAN_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];
const OTHER_COLOR = 'var(--color-muted-foreground)';

function ChartTooltip({
  active,
  label,
  value,
  sub,
}: {
  active?: boolean;
  label: string;
  value: string;
  sub?: string;
}) {
  if (!active) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-popover-foreground">{value}</p>
      {sub && <p className="text-muted-foreground">{sub}</p>}
    </div>
  );
}

function CheckInTrendChart({ data }: { data: CheckInTrendPoint[] }) {
  const gradientId = useId();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  // Sparse ticks — a label on every one of 30 days is unreadable.
  const ticks = useMemo(
    () => data.filter((_, i) => i % 6 === 0).map((d) => d.date),
    [data],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100/40">
            <TrendingUp className="h-4 w-4 text-primary-base" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Check-in Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {total} total check-ins
        </span>
      </CardHeader>
      <CardContent className="h-56 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-chart-1)"
                  stopOpacity={0.12}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={(d: string) => format(parseISO(d), 'MMM d')}
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={28}
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={
                    label ? format(parseISO(String(label)), 'EEEE, MMM d') : ''
                  }
                  value={`${payload?.[0]?.value ?? 0} check-ins`}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: 'var(--color-chart-1)',
                stroke: 'var(--color-card)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PlanBreakdownChart({ data }: { data: PlanBreakdownItem[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const colored = data.map((d, i) => ({
    ...d,
    color:
      d.planName === 'Other'
        ? OTHER_COLOR
        : PLAN_COLORS[i % PLAN_COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100/40">
            <PieChartIcon className="h-4 w-4 text-primary-base" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Plan Mix
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Active subscriptions by plan
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No active subscriptions yet.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={colored}
                    dataKey="count"
                    nameKey="planName"
                    innerRadius="62%"
                    outerRadius="90%"
                    strokeWidth={2}
                    stroke="var(--color-card)"
                  >
                    {colored.map((entry) => (
                      <Cell key={entry.planName} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      const item = payload?.[0]?.payload as
                        | (PlanBreakdownItem & { color: string })
                        | undefined;
                      if (!item) return null;
                      const pct = Math.round((item.count / total) * 100);
                      return (
                        <ChartTooltip
                          active={active}
                          label={item.planName}
                          value={`${item.count} member${item.count === 1 ? '' : 's'}`}
                          sub={`${pct}% of active subscriptions`}
                        />
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 self-stretch">
              {colored.map((item) => {
                const pct = Math.round((item.count / total) * 100);
                return (
                  <li
                    key={item.planName}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {item.planName}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {item.count} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsPanels({
  checkInTrend,
  subscriptionsByPlan,
}: {
  checkInTrend: CheckInTrendPoint[];
  subscriptionsByPlan: PlanBreakdownItem[];
}) {
  return (
    <div className="space-y-4">
      <CheckInTrendChart data={checkInTrend} />
      <PlanBreakdownChart data={subscriptionsByPlan} />
    </div>
  );
}
