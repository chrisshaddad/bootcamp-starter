'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { HomeIcon, LifeBuoyIcon } from 'lucide-react';

import { useGetTenantOverviewQuery } from '@/store/api/endpoints/tenant.api';
import type {
  MeResponse,
  LeaseStatus,
  TenantLeaseView,
  TenantOverviewResponse,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';
import { getPortalDict, type PortalDict } from '@/components/portal/portal-dict';
import { useMoney } from '@/components/dashboard/kpi-tile';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  me: MeResponse | null;
  userName: string;
  locale: string;
  dict: Dictionary;
};

// Mirrors the tenant-dashboard lease-status palette.
const LEASE_STATUS_STYLES: Record<LeaseStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-transparent',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
  terminated: 'bg-muted text-muted-foreground border-transparent',
};

export function PortalHome({ me, userName, locale, dict }: Props) {
  const t = getPortalDict(dict, locale);
  const money = useMoney(locale);
  const { data: overview, isLoading, isError } = useGetTenantOverviewQuery();

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [locale],
  );
  const fmtDate = (iso: string) => dateFmt.format(new Date(iso));

  const name = me?.user?.fullName ?? userName;
  const orgName = me?.org?.name;

  // Newest first; the active/current lease is surfaced first regardless.
  const currentId = overview?.lease?.id ?? null;
  const history = useMemo(() => {
    const list = [...(overview?.leaseHistory ?? [])];
    list.sort((a, b) => {
      const aCurrent = a.id === currentId || a.effectiveStatus === 'active';
      const bCurrent = b.id === currentId || b.effectiveStatus === 'active';
      if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
      return b.startDate.localeCompare(a.startDate);
    });
    return list;
  }, [overview?.leaseHistory, currentId]);

  const hero = (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-6 text-white shadow-sm sm:p-8">
      <p className="text-sm font-medium text-white/80">
        {orgName ?? t.brandSubtitle}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {name ? `${t.home.welcome}, ${name}` : t.home.welcome}
      </h1>
      <p className="mt-1 text-sm text-white/85">{t.home.subtitle}</p>
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      {hero}

      <section className="flex flex-col gap-4">
        <h2 className="px-1 text-base font-semibold text-foreground">
          {t.home.historyTitle}
        </h2>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : isError ? (
          <Card className="ring-amber-200/50 dark:ring-amber-900/30">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t.home.loadError}
            </CardContent>
          </Card>
        ) : !overview?.linked ? (
          <Card className="border-dashed ring-amber-200/60 dark:ring-amber-900/30">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                <HomeIcon className="size-7" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-foreground">
                  {t.home.notLinkedTitle}
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {t.home.notLinkedDesc}
                </p>
              </div>
              <Link
                href={`/${locale}/portal/support`}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-amber-700 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:text-amber-400"
              >
                <LifeBuoyIcon className="size-4" />
                {t.home.viewSupport}
              </Link>
            </CardContent>
          </Card>
        ) : history.length === 0 ? (
          <Card className="border-dashed ring-amber-200/60 dark:ring-amber-900/30">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t.home.emptyHistory}
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-4">
            {history.map((lease) => (
              <li key={lease.id}>
                <LeaseHistoryCard
                  lease={lease}
                  current={
                    lease.id === currentId || lease.effectiveStatus === 'active'
                  }
                  t={t}
                  money={money}
                  fmtDate={fmtDate}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LeaseHistoryCard({
  lease,
  current,
  t,
  money,
  fmtDate,
}: {
  lease: TenantLeaseView;
  current: boolean;
  t: PortalDict;
  money: ReturnType<typeof useMoney>;
  fmtDate: (iso: string) => string;
}) {
  return (
    <Card
      className={
        current
          ? 'bg-amber-50/40 ring-2 ring-amber-300/70 dark:bg-amber-400/5 dark:ring-amber-500/30'
          : 'ring-foreground/10'
      }
    >
      <CardContent className="flex flex-col gap-4">
        {/* Header: unit + building · status */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={[
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                current
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
              ].join(' ')}
            >
              <HomeIcon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {t.home.unit} {lease.unitNumber}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {lease.buildingName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {current && (
              <Badge className="border-transparent bg-amber-500 text-white">
                {t.home.current}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={LEASE_STATUS_STYLES[lease.effectiveStatus]}
            >
              {t.leaseStatus[lease.effectiveStatus]}
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="grid gap-x-6 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-3">
          <DetailField label={t.home.term}>
            {fmtDate(lease.startDate)}
            <span className="text-muted-foreground">{` ${t.home.to} `}</span>
            {fmtDate(lease.endDate)}
          </DetailField>
          <DetailField label={t.home.rent}>
            <span className="tabular-nums">
              {money.format(parseFloat(lease.rentAmount))}
            </span>
          </DetailField>
          <DetailField label={t.home.deposit}>
            <span className="tabular-nums">
              {money.format(parseFloat(lease.depositAmount))}
            </span>
          </DetailField>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}
