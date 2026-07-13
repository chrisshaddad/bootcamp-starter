'use client';

import type { MonthlyReportResponse } from '@repo/contracts';
import { TrendingUp } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────

const PALETTE = [
  '#7C4DFF',
  '#22D3EE',
  '#E879F9',
  '#34D39A',
  '#FBBF24',
  '#F4506A',
  '#2F78EE',
  '#FE964A',
];

function money(value: string | number, compact = false): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact && Math.abs(num) >= 1000 ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
  }).format(num);
}

function signedPct(n: number | null): string {
  if (n === null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function formatDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return new Date(
    parseInt(y!, 10),
    parseInt(m!, 10) - 1,
    parseInt(d!, 10),
  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Trend chart (daily revenue vs expenses) ────────────────────────────────

function TrendChart({ data }: { data: MonthlyReportResponse['dailyTrend'] }) {
  const W = 720;
  const H = 220;
  const PAD = { top: 16, right: 12, bottom: 28, left: 56 };
  const inner = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom };

  const revenue = data.map((d) => parseFloat(d.revenue));
  const expenses = data.map((d) => parseFloat(d.expenses));
  const maxVal = Math.max(...revenue, ...expenses, 1);
  const n = data.length;

  if (!n) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">
        No activity recorded for this period.
      </div>
    );
  }

  const x = (i: number) => (n === 1 ? inner.w / 2 : (i / (n - 1)) * inner.w);
  const y = (v: number) => inner.h - (v / maxVal) * inner.h;

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const areaPath = (vals: number[]) =>
    `${linePath(vals)} L ${x(n - 1)} ${inner.h} L ${x(0)} ${inner.h} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: maxVal * f,
    y: y(maxVal * f),
  }));

  // Show at most ~8 date labels to avoid crowding.
  const labelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 480 }}
      >
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C4DFF" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#7C4DFF" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {ticks.map(({ v, y: ty }) => (
            <g key={v}>
              <line
                x1={0}
                x2={inner.w}
                y1={ty}
                y2={ty}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={-8}
                y={ty + 4}
                textAnchor="end"
                fontSize={10}
                fill="#94a3b8"
              >
                {money(v, true)}
              </text>
            </g>
          ))}

          {/* Revenue area + line */}
          <path d={areaPath(revenue)} fill="url(#revFill)" />
          <path
            d={linePath(revenue)}
            fill="none"
            stroke="#7C4DFF"
            strokeWidth={2}
          />
          {/* Expenses line */}
          <path
            d={linePath(expenses)}
            fill="none"
            stroke="#FBBF24"
            strokeWidth={2}
            strokeDasharray="4 3"
          />

          {/* X labels */}
          {data.map((d, i) =>
            i % labelStep === 0 ? (
              <text
                key={d.date}
                x={x(i)}
                y={inner.h + 18}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                {formatDay(d.date)}
              </text>
            ) : null,
          )}
          <line
            x1={0}
            x2={inner.w}
            y1={inner.h}
            y2={inner.h}
            stroke="#cbd5e1"
          />
        </g>
      </svg>
    </div>
  );
}

// ─── Donut (expenses by category) ───────────────────────────────────────────

function DonutChart({
  data,
}: {
  data: MonthlyReportResponse['expensesByCategory'];
}) {
  const R = 62;
  const CX = 80;
  const CY = 80;
  const stroke = 24;

  if (!data.length) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-slate-400">
        No expenses recorded.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.percentage, 0) || 100;
  let offset = -90;

  const arc = (startDeg: number, endDeg: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = CX + R * Math.cos(toRad(startDeg));
    const y1 = CY + R * Math.sin(toRad(startDeg));
    const x2 = CX + R * Math.cos(toRad(endDeg));
    const y2 = CY + R * Math.sin(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  const slices = data.map((d, i) => {
    const angle = (d.percentage / total) * 360;
    const start = offset;
    offset += angle;
    return {
      ...d,
      start,
      angle,
      color: d.color ?? PALETTE[i % PALETTE.length]!,
    };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 160 160" className="h-[150px] w-[150px] shrink-0">
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        {slices.map((s, i) => (
          <path
            key={i}
            d={arc(s.start, s.start + Math.max(s.angle - 1, 0.5))}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
          />
        ))}
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#94a3b8"
        >
          Categories
        </text>
        <text
          x={CX}
          y={CY + 12}
          textAnchor="middle"
          fontSize={14}
          fontWeight="bold"
          fill="#0f172a"
        >
          {data.length}
        </text>
      </svg>

      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {slices.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate text-slate-600">{s.categoryName}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-900">
              {money(s.amount)}{' '}
              <span className="text-slate-400">
                ({s.percentage.toFixed(1)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── KPI tile ───────────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
        {value}
      </p>
      {delta && (
        <p
          className={
            positive === undefined
              ? 'mt-0.5 text-xs text-slate-500'
              : positive
                ? 'mt-0.5 text-xs font-medium text-emerald-600'
                : 'mt-0.5 text-xs font-medium text-rose-600'
          }
        >
          {delta}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
      {children}
    </h2>
  );
}

/**
 * One printable "row" of the report. Rendered as a genuine <tr>/<td> (not a
 * div styled with `display: table-row`) because a table composed of many
 * modestly-sized rows is the case Chrome's print engine paginates reliably —
 * unlike a single giant cell holding the whole report, which produced
 * corrupted page ordering. Each row keeps whole by default (`break-inside:
 * avoid` in globals.css); pass `breakable` for the one section (AI Insights)
 * that may legitimately need to span multiple pages on its own.
 */
function ReportRow({
  children,
  breakable,
}: {
  children: React.ReactNode;
  breakable?: boolean;
}) {
  return (
    <tr
      data-breakable={breakable ? '' : undefined}
      className="block print:table-row"
    >
      <td className="block px-8 py-2.5 print:table-cell">{children}</td>
    </tr>
  );
}

// ─── Report document ────────────────────────────────────────────────────────

export function ReportDocument({ report }: { report: MonthlyReportResponse }) {
  const s = report.summary;
  const netProfit = parseFloat(s.netProfit);
  const c = report.comparison;

  // Rendered as a genuine <table>/<thead>/<tbody> — not a div styled with
  // `display: table` — because Chrome's print engine only repeats a header on
  // every page for real table markup. On screen everything renders as normal
  // block layout (`table`/`table-row`/`table-cell` classes only apply under
  // print, via Tailwind's `print:` variant).
  return (
    <table
      id="report-document"
      className="mx-auto block w-full max-w-[820px] border-collapse rounded-2xl bg-white text-slate-900 shadow-lg ring-1 ring-slate-200 print:table print:max-w-none print:rounded-none print:shadow-none print:ring-0"
    >
      {/* Header band — a real <thead>, so it repeats on every printed page. */}
      <thead className="block print:table-header-group">
        <tr className="block print:table-row">
          <td className="block p-0 print:table-cell">
            <div className="flex items-start justify-between gap-4 rounded-t-2xl bg-gradient-to-br from-[#5B30D6] to-[#7C4DFF] px-8 py-4 text-white print:rounded-none">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15">
                    <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold tracking-tight">
                    Margin
                  </span>
                </div>
                <h1 className="text-2xl font-bold leading-tight">
                  Monthly Business Report
                </h1>
                <p className="mt-1 text-sm text-white/80">
                  {report.organizationName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{report.label}</p>
                <p className="mt-1 text-xs text-white/70">
                  {report.periodStart} → {report.periodEnd}
                </p>
                <p className="mt-1.5 text-[11px] text-white/60">
                  Generated{' '}
                  {new Date(report.generatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </td>
        </tr>
      </thead>

      {/* Body — one <tr> per section, the pagination pattern Chrome handles
          reliably for tables spanning many printed pages. */}
      <tbody className="block print:table-row-group">
        {!report.hasData ? (
          <ReportRow>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">{report.narrative[0]}</p>
            </div>
          </ReportRow>
        ) : (
          <>
            {/* Highlights */}
            {report.highlights.length > 0 && (
              <ReportRow>
                <div className="flex flex-wrap gap-2">
                  {report.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </ReportRow>
            )}

            {/* KPI grid */}
            <ReportRow>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi
                  label="Revenue"
                  value={money(s.totalRevenue)}
                  delta={c ? `${signedPct(c.revenueChangePct)} MoM` : undefined}
                  positive={
                    c?.revenueChangePct == null
                      ? undefined
                      : c.revenueChangePct >= 0
                  }
                />
                <Kpi
                  label="Gross Profit"
                  value={money(s.grossProfit)}
                  delta={`${s.grossMarginPct.toFixed(1)}% margin`}
                />
                <Kpi
                  label="Expenses"
                  value={money(s.totalExpenses)}
                  delta={c ? `${signedPct(c.expenseChangePct)} MoM` : undefined}
                  positive={
                    c?.expenseChangePct == null
                      ? undefined
                      : c.expenseChangePct <= 0
                  }
                />
                <Kpi
                  label={netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                  value={money(Math.abs(netProfit))}
                  delta={`${s.netMarginPct.toFixed(1)}% net margin`}
                  positive={netProfit >= 0}
                />
              </div>
            </ReportRow>

            {/* Narrative */}
            <ReportRow>
              <SectionTitle>Executive Summary</SectionTitle>
              <div className="space-y-2.5">
                {report.narrative.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-600">
                    {p}
                  </p>
                ))}
              </div>
            </ReportRow>

            {/* Trend chart */}
            <ReportRow>
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle>Revenue vs Expenses</SectionTitle>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 bg-[#7C4DFF]" />
                    Revenue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#FBBF24]" />
                    Expenses
                  </span>
                </div>
              </div>
              <TrendChart data={report.dailyTrend} />
            </ReportRow>

            {/* Expenses + Products */}
            <ReportRow>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <SectionTitle>Expenses by Category</SectionTitle>
                  <DonutChart data={report.expensesByCategory} />
                </div>
                <div>
                  <SectionTitle>Product Contribution</SectionTitle>
                  {report.productContributions.length ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="pb-2 text-left font-semibold">
                            Product
                          </th>
                          <th className="pb-2 text-right font-semibold">
                            Revenue
                          </th>
                          <th className="pb-2 text-right font-semibold">
                            Margin
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.productContributions.slice(0, 8).map((p) => (
                          <tr
                            key={p.productId ?? 'direct'}
                            className="border-b border-slate-100"
                          >
                            <td className="max-w-[140px] truncate py-2 font-medium text-slate-700">
                              {p.productName}
                            </td>
                            <td className="py-2 text-right tabular-nums text-slate-600">
                              {money(p.revenue, true)}
                            </td>
                            <td className="py-2 text-right tabular-nums text-slate-900">
                              {p.grossMarginPct.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No product-linked sales this month.
                    </p>
                  )}
                </div>
              </div>
            </ReportRow>

            {/* Top sales + expenses */}
            <ReportRow>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <SectionTitle>Top Sales</SectionTitle>
                  <LineItemTable
                    items={report.topSales}
                    emptyLabel="No sales recorded."
                  />
                </div>
                <div>
                  <SectionTitle>Top Expenses</SectionTitle>
                  <LineItemTable
                    items={report.topExpenses}
                    emptyLabel="No expenses recorded."
                  />
                </div>
              </div>
            </ReportRow>

            {/* Goals */}
            {report.goals.length > 0 && (
              <ReportRow breakable={report.goals.length > 6}>
                <SectionTitle>Goal Progress</SectionTitle>
                <div className="space-y-3">
                  {report.goals.map((g) => {
                    const pct = Math.min(g.progressPct, 100);
                    const isLimit = g.type === 'EXPENSE_LIMIT';
                    const over = g.progressPct > 100;
                    const color =
                      isLimit && over
                        ? '#F4506A'
                        : isLimit
                          ? '#FBBF24'
                          : pct >= 100
                            ? '#34D39A'
                            : '#7C4DFF';
                    return (
                      <div
                        key={g.goalId}
                        className="break-inside-avoid space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {g.type.replace(/_/g, ' ')}
                          </span>
                          <span className="tabular-nums text-slate-500">
                            {money(g.currentAmount)} / {money(g.targetAmount)} (
                            {g.progressPct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ReportRow>
            )}

            {/* AI insights — the one section that may legitimately span
                multiple pages, so it's the only row allowed to break. */}
            {report.insights.length > 0 && (
              <ReportRow breakable>
                <SectionTitle>AI Insights</SectionTitle>
                <div className="space-y-4">
                  {report.insights.map((ins) => (
                    <div
                      key={ins.id}
                      className="break-inside-avoid rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-[#7C4DFF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7C4DFF]">
                          {ins.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {ins.periodStart} → {ins.periodEnd}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {ins.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {ins.summary}
                      </p>
                      {ins.recommendations.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {ins.recommendations.map((r, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-xs text-slate-600"
                            >
                              <span className="text-[#7C4DFF]">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </ReportRow>
            )}
          </>
        )}

        {/* Footer */}
        <ReportRow>
          <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
            {report.organizationName} · {report.label} · Generated by Margin ·
            All figures in USD
          </div>
        </ReportRow>
      </tbody>
    </table>
  );
}

// ─── Shared line-item table ─────────────────────────────────────────────────

function LineItemTable({
  items,
  emptyLabel,
}: {
  items: MonthlyReportResponse['topSales'];
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }
  return (
    <table className="w-full text-xs">
      <tbody>
        {items.map((it) => (
          <tr key={it.id} className="border-b border-slate-100">
            <td className="py-2">
              <p className="max-w-[180px] truncate font-medium text-slate-700">
                {it.label}
              </p>
              <p className="text-[11px] text-slate-400">
                {it.category ? `${it.category} · ` : ''}
                {formatDay(it.date)}
              </p>
            </td>
            <td className="py-2 text-right tabular-nums font-semibold text-slate-900">
              {money(it.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
