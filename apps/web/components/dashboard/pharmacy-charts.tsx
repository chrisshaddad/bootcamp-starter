'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PharmacyBranchStat } from '@repo/contracts';

// Shared colour language for the whole dashboard. Green = your team/capacity;
// blue / red / amber = the three kinds of attention. Values pulled from the
// theme tokens in globals.css so charts recolour with the design system.
// The alert trio was validated for colour-blind separation (see dataviz skill);
// direct labels + this legend provide the required secondary encoding.
export const ATTENTION_SERIES = [
  { key: 'openInquiries', label: 'Open inquiries', color: 'var(--color-blue)' },
  { key: 'lowStock', label: 'Low stock', color: 'var(--color-error)' },
  { key: 'nearExpiry', label: 'Near expiry', color: 'var(--color-warn-accent)' },
] as const;

const STAFF_COLOR = 'var(--color-primary-base)';
// Neutral track drawn behind every bar so a branch with 0 in a category still
// reads as "present, just empty" rather than missing data.
const TRACK_FILL = '#F1F5F4';

function truncate(value: string, max = 12): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

// Recharts injects these props into a `content` element; typed loosely and all
// optional so the element can be passed as `<Tooltip content={<X />} />`.
interface TooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function TooltipShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-40 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-2 truncate text-xs font-semibold text-gray-900">
        {title}
      </p>
      {children}
    </div>
  );
}

function AttentionTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);
  return (
    <TooltipShell title={label ?? ''}>
      <ul className="space-y-1.5">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey)}
            className="flex items-center gap-2 text-xs"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: entry.color }}
            />
            <span className="text-gray-500">{entry.name}</span>
            <span className="ml-auto font-semibold text-gray-900">
              {entry.value ?? 0}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
        <span className="text-gray-500">Total</span>
        <span className="font-semibold text-gray-900">{total}</span>
      </div>
    </TooltipShell>
  );
}

function StaffTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipShell title={label ?? ''}>
      <div className="flex items-center gap-2 text-xs">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
          style={{ background: STAFF_COLOR }}
        />
        <span className="text-gray-500">Staff</span>
        <span className="ml-auto font-semibold text-gray-900">
          {payload[0]?.value ?? 0}
        </span>
      </div>
    </TooltipShell>
  );
}

/**
 * Legend row for the attention chart — rendered inline beside the panel title
 * (exported so the page can place it in the header, keeping the plot area tall).
 */
export function AttentionLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {ATTENTION_SERIES.map((series) => (
        <li key={series.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: series.color }}
          />
          <span className="text-xs text-gray-500">{series.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Stacked bars — one per branch — segmented by the three attention types. Fills
 * its container height. A neutral track behind each bar keeps every branch
 * visible even at zero, and a 1.5px white ring separates the stacked fills
 * (dataviz spacer spec). Fixed bar size keeps widths stable from 2 to 10
 * branches.
 */
export function AttentionByBranchChart({
  branches,
}: {
  branches: PharmacyBranchStat[];
}) {
  const data = branches.map((branch) => ({
    name: branch.name,
    openInquiries: branch.openInquiries,
    lowStock: branch.lowStock,
    nearExpiry: branch.nearExpiry,
  }));

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
          barCategoryGap="20%"
          barGap={4}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--color-gray-200)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={(v: string) => truncate(v)}
            tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-gray-100)' }}
            content={<AttentionTooltip />}
          />
          {ATTENTION_SERIES.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId="attention"
              fill={series.color}
              stroke="var(--color-white)"
              strokeWidth={1.5}
              barSize={48}
              // Draw the neutral track once, behind the bottom-most series.
              background={
                index === 0 ? { fill: TRACK_FILL, radius: 4 } : undefined
              }
              radius={
                index === ATTENTION_SERIES.length - 1
                  ? [4, 4, 0, 0]
                  : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Horizontal bars ranking branches by headcount — a single brand-green hue, so
 * no categorical palette is needed. Fills its container height, with a neutral
 * lane behind each bar and the count direct-labelled at the end.
 */
export function StaffByBranchChart({
  branches,
}: {
  branches: PharmacyBranchStat[];
}) {
  const data = branches
    .map((branch) => ({ name: branch.name, staff: branch.staff }))
    .sort((a, b) => b.staff - a.staff);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--color-gray-200)"
            strokeDasharray="3 3"
          />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={92}
            tickFormatter={(v: string) => truncate(v, 13)}
            tick={{ fontSize: 12, fill: 'var(--color-gray-600)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-gray-100)' }}
            content={<StaffTooltip />}
          />
          <Bar
            dataKey="staff"
            radius={[0, 4, 4, 0]}
            barSize={22}
            background={{ fill: TRACK_FILL, radius: 4 }}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={STAFF_COLOR} />
            ))}
            <LabelList
              dataKey="staff"
              position="right"
              className="fill-gray-700"
              style={{ fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
