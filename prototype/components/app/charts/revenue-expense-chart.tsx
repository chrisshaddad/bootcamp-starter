"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CurrencyTooltip } from "./chart-tooltip";

export function RevenueExpenseChart({
  data,
}: {
  data: { label: string; revenue: number; expenses: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
        barGap={4}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
          content={<CurrencyTooltip />}
        />
        <Bar
          dataKey="revenue"
          name="Revenue"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="var(--chart-3)"
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
