'use client';

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Fixed categorical order - never reassigned by count or rank, so a status
// keeps the same color across renders regardless of which ones are nonzero.
const CATEGORICAL_COLORS = [
  'var(--viz-cat-1)',
  'var(--viz-cat-2)',
  'var(--viz-cat-3)',
  'var(--viz-cat-4)',
  'var(--viz-cat-5)',
];

interface StatusBreakdownChartProps {
  title: string;
  /** Every status this dimension can take, in a fixed display order. */
  order: string[];
  labels: Record<string, string>;
  counts: Record<string, number>;
}

export function StatusBreakdownChart({
  title,
  order,
  labels,
  counts,
}: StatusBreakdownChartProps) {
  const data = order.map((status, i) => ({
    status,
    label: labels[status] ?? status,
    count: counts[status] ?? 0,
    fill: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length],
  }));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                barCategoryGap="25%"
              >
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={100}
                  tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {data.map((d) => (
                    <Cell key={d.status} fill={d.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fill: 'var(--foreground)', fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
