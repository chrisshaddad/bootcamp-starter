'use client';

import { useMemo, useState } from 'react';
import {
  KeyRoundIcon,
  BuildingIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  WalletIcon,
  AlertTriangleIcon,
  ReceiptTextIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  useGetReportSummaryQuery,
  useGetRentRollQuery,
  useGetOverdueInvoicesQuery,
} from '@/store/api/endpoints/reports.api';
import type { ReportSummary } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// Validated categorical pair (dataviz skill): income = blue slot 1, expenses =
// orange slot 6. Worst-adjacent CVD ΔE 24.7 (light) — well above the ≥8 target.
const INCOME_COLOR = '#2a78d6';
const EXPENSE_COLOR = '#eb6834';

interface ReportsPageProps {
  locale: string;
  dict: Dictionary;
}

function useMoney(locale: string) {
  return useMemo(
    () =>
      new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
  children,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
  children?: React.ReactNode;
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-red-600'
        : 'text-foreground';
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/70">{icon}</span>
      </div>
      <span
        className={`text-2xl font-semibold tracking-tight tabular-nums ${toneClass}`}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {children}
    </div>
  );
}

// ── Occupancy meter (sequential single hue) ──────────────────────────────────

function OccupancyMeter({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${clamped}%`, backgroundColor: INCOME_COLOR }}
      />
    </div>
  );
}

// ── Income vs expenses grouped bars ──────────────────────────────────────────

type BarGroup = { label: string; income: number; expenses: number };

function IncomeExpensesChart({
  groups,
  dict,
  format,
}: {
  groups: BarGroup[];
  dict: Dictionary;
  format: Intl.NumberFormat;
}) {
  const t = dict.reports;
  const max = Math.max(1, ...groups.flatMap((g) => [g.income, g.expenses]));

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t.chart.title}</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: INCOME_COLOR }}
              aria-hidden
            />
            {t.chart.income}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: EXPENSE_COLOR }}
              aria-hidden
            />
            {t.chart.expenses}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.label} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {g.label}
            </span>
            {(
              [
                { key: 'income', val: g.income, color: INCOME_COLOR },
                { key: 'expenses', val: g.expenses, color: EXPENSE_COLOR },
              ] as const
            ).map((bar) => (
              <div key={bar.key} className="flex items-center gap-2">
                <div className="flex h-4 flex-1 justify-start overflow-hidden rounded-sm bg-muted/60">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${(bar.val / max) * 100}%`,
                      backgroundColor: bar.color,
                      minWidth: bar.val > 0 ? '0.25rem' : 0,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-end text-xs tabular-nums text-muted-foreground">
                  {format.format(bar.val)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportsPage({ locale, dict }: ReportsPageProps) {
  const t = dict.reports;
  const money = useMoney(locale);

  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const summaryQuery = useGetReportSummaryQuery(range ?? undefined);
  const rentRollQuery = useGetRentRollQuery();
  const overdueQuery = useGetOverdueInvoicesQuery();

  const summary: ReportSummary | undefined = summaryQuery.data;

  const rangeValid = Boolean(fromInput && toInput && fromInput <= toInput);

  function applyRange() {
    if (rangeValid) setRange({ from: fromInput, to: toInput });
  }
  function clearRange() {
    setFromInput('');
    setToInput('');
    setRange(null);
  }

  const chartGroups: BarGroup[] = useMemo(() => {
    if (!summary) return [];
    const groups: BarGroup[] = [
      {
        label: t.chart.mtd,
        income: Number(summary.mtdIncome),
        expenses: Number(summary.mtdExpenses),
      },
      {
        label: t.chart.ytd,
        income: Number(summary.ytdIncome),
        expenses: Number(summary.ytdExpenses),
      },
    ];
    if (summary.range) {
      groups.push({
        label: t.chart.range,
        income: Number(summary.range.income),
        expenses: Number(summary.range.expenses),
      });
    }
    return groups;
  }, [summary, t.chart.mtd, t.chart.ytd, t.chart.range]);

  const netMtd = summary ? Number(summary.mtdNet) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          {t.methodologyNote}
        </p>
      </div>

      {/* Date-range filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reports-from">{t.filters.from}</Label>
          <Input
            id="reports-from"
            type="date"
            className="w-40"
            value={fromInput}
            max={toInput || undefined}
            onChange={(e) => setFromInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reports-to">{t.filters.to}</Label>
          <Input
            id="reports-to"
            type="date"
            className="w-40"
            value={toInput}
            min={fromInput || undefined}
            onChange={(e) => setToInput(e.target.value)}
          />
        </div>
        <Button onClick={applyRange} disabled={!rangeValid}>
          {t.filters.apply}
        </Button>
        {range && (
          <Button variant="outline" onClick={clearRange}>
            {t.filters.clear}
          </Button>
        )}
        <span className="ms-auto self-center text-xs text-muted-foreground">
          {t.filters.hint}
        </span>
      </div>

      {summaryQuery.isError ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {t.loadError}
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryQuery.isLoading || !summary ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))
            ) : (
              <>
                <StatTile
                  label={t.kpis.activeLeases}
                  value={String(summary.activeLeases)}
                  icon={<KeyRoundIcon className="size-4" />}
                />
                <StatTile
                  label={t.kpis.occupancy}
                  value={`${summary.occupancyPct}%`}
                  icon={<BuildingIcon className="size-4" />}
                  hint={`${summary.occupiedApartments} / ${summary.totalApartments} ${t.kpis.unitsOccupied}`}
                >
                  <OccupancyMeter pct={summary.occupancyPct} />
                </StatTile>
                <StatTile
                  label={t.kpis.mtdIncome}
                  value={money.format(Number(summary.mtdIncome))}
                  icon={<WalletIcon className="size-4" />}
                  hint={t.kpis.incomeHint}
                />
                <StatTile
                  label={t.kpis.mtdNet}
                  value={money.format(netMtd)}
                  tone={netMtd >= 0 ? 'positive' : 'negative'}
                  icon={
                    netMtd >= 0 ? (
                      <TrendingUpIcon className="size-4" />
                    ) : (
                      <TrendingDownIcon className="size-4" />
                    )
                  }
                  hint={t.kpis.netHint}
                />
              </>
            )}
          </div>

          {/* Selected-range summary */}
          {summary?.range && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label={t.kpis.rangeIncome}
                value={money.format(Number(summary.range.income))}
                icon={<WalletIcon className="size-4" />}
                hint={t.kpis.incomeHint}
              />
              <StatTile
                label={t.kpis.rangeExpenses}
                value={money.format(Number(summary.range.expenses))}
                icon={<ReceiptTextIcon className="size-4" />}
              />
              <StatTile
                label={t.kpis.rangeNet}
                value={money.format(Number(summary.range.net))}
                tone={Number(summary.range.net) >= 0 ? 'positive' : 'negative'}
                icon={
                  Number(summary.range.net) >= 0 ? (
                    <TrendingUpIcon className="size-4" />
                  ) : (
                    <TrendingDownIcon className="size-4" />
                  )
                }
                hint={t.kpis.netHint}
              />
            </div>
          )}

          {/* Income vs expenses chart */}
          {summaryQuery.isLoading || !summary ? (
            <Skeleton className="h-56 rounded-xl" />
          ) : (
            <IncomeExpensesChart
              groups={chartGroups}
              dict={dict}
              format={money}
            />
          )}
        </>
      )}

      {/* Rent roll */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t.rentRoll.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.rentRoll.subtitle}</p>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.rentRoll.unit}</TableHead>
                <TableHead>{t.rentRoll.renter}</TableHead>
                <TableHead className="text-end">{t.rentRoll.rent}</TableHead>
                <TableHead className="text-end">
                  {t.rentRoll.invoiced}
                </TableHead>
                <TableHead className="text-end">{t.rentRoll.paid}</TableHead>
                <TableHead className="text-end">{t.rentRoll.balance}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentRollQuery.isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rentRollQuery.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t.loadError}
                  </TableCell>
                </TableRow>
              ) : (rentRollQuery.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    <KeyRoundIcon className="size-8 mx-auto mb-2 opacity-30" />
                    {t.rentRoll.empty}
                  </TableCell>
                </TableRow>
              ) : (
                rentRollQuery.data?.map((row) => {
                  const balance = Number(row.balance);
                  return (
                    <TableRow key={row.leaseId}>
                      <TableCell className="font-medium">
                        {row.unitNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.renterName}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {money.format(Number(row.rent))}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {money.format(Number(row.invoiced))}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {money.format(Number(row.paid))}
                      </TableCell>
                      <TableCell
                        className={`text-end tabular-nums font-medium ${
                          balance > 0 ? 'text-red-600' : 'text-foreground'
                        }`}
                      >
                        {money.format(balance)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Overdue invoices */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="size-4 text-amber-600" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {t.overdue.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.overdue.subtitle}
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.overdue.unit}</TableHead>
                <TableHead>{t.overdue.renter}</TableHead>
                <TableHead>{t.overdue.dueDate}</TableHead>
                <TableHead className="text-end">{t.overdue.invoiced}</TableHead>
                <TableHead className="text-end">{t.overdue.paid}</TableHead>
                <TableHead className="text-end">{t.overdue.balance}</TableHead>
                <TableHead className="text-end">
                  {t.overdue.daysOverdue}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueQuery.isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : overdueQuery.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t.loadError}
                  </TableCell>
                </TableRow>
              ) : (overdueQuery.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    <AlertTriangleIcon className="size-8 mx-auto mb-2 opacity-30" />
                    {t.overdue.empty}
                  </TableCell>
                </TableRow>
              ) : (
                overdueQuery.data?.map((row) => (
                  <TableRow key={row.invoiceId}>
                    <TableCell className="font-medium">
                      {row.unitNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.renterName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.dueDate).toLocaleDateString(
                        locale === 'ar' ? 'ar' : 'en',
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {money.format(Number(row.invoiced))}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {money.format(Number(row.paid))}
                    </TableCell>
                    <TableCell className="text-end tabular-nums font-medium text-red-600">
                      {money.format(Number(row.balance))}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {row.daysOverdue}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
