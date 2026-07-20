'use client';

import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  WalletIcon,
  ReceiptTextIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';
import { useListTimelineQuery } from '@/store/api/endpoints/timeline.api';
import {
  useGetReportSummaryQuery,
  useGetOverdueInvoicesQuery,
} from '@/store/api/endpoints/reports.api';
import { overdueOutstanding } from '@/lib/dashboard-kpis';
import { KpiTile, useMoney } from '@/components/dashboard/kpi-tile';
import type { MeResponse } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FinanceDashboardProps {
  me: MeResponse | null;
  locale: string;
  dict: Dictionary;
}

function humanizeAction(action: string): string {
  const humanized = action.replace(/\./g, ' ');
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

const OVERDUE_PREVIEW = 6;

export function FinanceDashboard({ me, locale, dict }: FinanceDashboardProps) {
  const t = dict.dashboard;
  const k = t.kpi;
  const r = dict.reports;
  const money = useMoney(locale);
  const dateLocale = locale === 'ar' ? ar : undefined;
  const base = `/${locale}/dashboard`;

  const { data: summary, isLoading: summaryLoading } = useGetReportSummaryQuery();
  const { data: overdue, isLoading: overdueLoading } =
    useGetOverdueInvoicesQuery();
  const { data: timelineData, isLoading: timelineLoading } =
    useListTimelineQuery({ limit: 5 });

  const timelineEvents = (timelineData?.data ?? []).slice(0, 5);
  const overdueTotal = overdueOutstanding(overdue);
  const overdueCount = overdue?.length ?? 0;
  const netMtd = summary ? Number(summary.mtdNet) : 0;
  const overduePreview = (overdue ?? []).slice(0, OVERDUE_PREVIEW);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.paymentsFinance}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {me?.org?.name ? `${me.org.name} · ` : ''}
          {k.financeOverview}
        </p>
      </div>

      {/* KPI row — live from reports + overdue */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={k.incomeMtd}
          value={summary ? money.format(Number(summary.mtdIncome)) : k.noData}
          icon={<WalletIcon className="size-4" />}
          href={`${base}/invoices`}
          loading={summaryLoading}
        />
        <KpiTile
          label={k.expensesMtd}
          value={summary ? money.format(Number(summary.mtdExpenses)) : k.noData}
          icon={<ReceiptTextIcon className="size-4" />}
          href={`${base}/expenses`}
          loading={summaryLoading}
        />
        <KpiTile
          label={k.netMtd}
          value={summary ? money.format(netMtd) : k.noData}
          tone={netMtd >= 0 ? 'positive' : 'negative'}
          icon={
            netMtd >= 0 ? (
              <TrendingUpIcon className="size-4" />
            ) : (
              <TrendingDownIcon className="size-4" />
            )
          }
          href={`${base}/reports`}
          loading={summaryLoading}
        />
        <KpiTile
          label={k.overdue}
          value={money.format(overdueTotal)}
          tone={overdueTotal > 0 ? 'negative' : 'neutral'}
          hint={`${overdueCount} ${k.invoicesPastDue}`}
          icon={<AlertTriangleIcon className="size-4" />}
          href={`${base}/invoices`}
          loading={overdueLoading}
        />
      </div>

      {/* Overdue invoices preview */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-4 text-amber-600" />
            <h2 className="text-lg font-semibold tracking-tight">
              {r.overdue.title}
            </h2>
          </div>
          <Button variant="outline" size="sm" render={<Link href={`${base}/reports`} />}>
            {k.viewAll}
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{r.overdue.unit}</TableHead>
                <TableHead>{r.overdue.renter}</TableHead>
                <TableHead>{r.overdue.dueDate}</TableHead>
                <TableHead className="text-end">{r.overdue.balance}</TableHead>
                <TableHead className="text-end">
                  {r.overdue.daysOverdue}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : overduePreview.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {r.overdue.empty}
                  </TableCell>
                </TableRow>
              ) : (
                overduePreview.map((row) => (
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

      {/* Recent activity */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.recentActivity}
        </h3>
        {timelineLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : timelineEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noActivity}</p>
        ) : (
          <div className="space-y-2">
            {timelineEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-4 border-b border-border/50 py-2 last:border-0"
              >
                <p className="text-sm">{humanizeAction(event.action)}</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
