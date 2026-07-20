'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  HomeIcon,
  WalletIcon,
  ReceiptTextIcon,
  WrenchIcon,
  PlusIcon,
  ClockIcon,
} from 'lucide-react';

import { useListTimelineQuery } from '@/store/api/endpoints/timeline.api';
import {
  useGetTenantOverviewQuery,
  useCreateTenantMaintenanceRequestMutation,
} from '@/store/api/endpoints/tenant.api';
import type {
  MeResponse,
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
  InvoiceStatus,
  LeaseStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';
import { KpiTile, useMoney } from '@/components/dashboard/kpi-tile';
import { canOpenRequest, balanceTone } from '@/lib/tenant-overview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

// ── Badge styling (mirrors support-page's status palette) ─────────────────────

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  partially_paid: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

const REQUEST_STATUS_STYLES: Record<MaintenanceRequestStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground border-transparent',
};

const PRIORITY_STYLES: Record<MaintenanceRequestPriority, string> = {
  low: 'bg-muted text-muted-foreground border-transparent',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITIES: MaintenanceRequestPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];

const OPEN_STATUSES: MaintenanceRequestStatus[] = ['open', 'in_progress'];

// ── Form ──────────────────────────────────────────────────────────────────────

type RequestFormValues = {
  title: string;
  description: string;
  priority: MaintenanceRequestPriority;
};

const EMPTY_VALUES: RequestFormValues = {
  title: '',
  description: '',
  priority: 'medium',
};

interface TenantDashboardProps {
  me: MeResponse | null;
  locale: string;
  dict: Dictionary;
}

export function TenantDashboard({ me, locale, dict }: TenantDashboardProps) {
  const isAr = locale === 'ar';
  const t = dict.dashboard.tenant;
  const money = useMoney(locale);

  const {
    data: overview,
    isLoading,
    isError,
  } = useGetTenantOverviewQuery();
  const [createRequest, { isLoading: creating }] =
    useCreateTenantMaintenanceRequestMutation();
  const { data: timelineData, isLoading: timelineLoading } =
    useListTimelineQuery({ limit: 5 });

  const [createOpen, setCreateOpen] = useState(false);

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

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().trim().min(1, t.form.titleRequired),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
      }),
    [t],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  const events = timelineData?.data ?? [];
  const requests = overview?.maintenanceRequests ?? [];
  const openCount = requests.filter((r) =>
    OPEN_STATUSES.includes(r.status),
  ).length;
  const canOpen = canOpenRequest(overview);

  async function onSubmit(values: RequestFormValues) {
    try {
      await createRequest({
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        priority: values.priority,
      }).unwrap();
      toast.success(t.requests.created);
      setCreateOpen(false);
      reset(EMPTY_VALUES);
    } catch {
      toast.error(t.requests.createError);
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {`${t.welcome}${me?.user?.fullName ? `, ${me.user.fullName}` : ''}`}
        </CardTitle>
        <CardDescription>
          {me?.org?.name ? `${t.subtitle} · ${me.org.name}` : t.subtitle}
        </CardDescription>
      </CardHeader>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {t.loadError}
        </div>
      </div>
    );
  }

  // Not linked yet — warm empty state, no numbers.
  if (!overview?.linked) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="border border-dashed border-muted-foreground/20 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <HomeIcon className="h-10 w-10 text-primary/50" />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">{t.notLinkedTitle}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t.notLinkedDesc}
              </p>
            </div>
          </CardContent>
        </Card>
        <ActivityCard
          title={t.yourActivity}
          empty={dict.dashboard.noActivity}
          loading={timelineLoading}
          events={events}
          isAr={isAr}
        />
      </div>
    );
  }

  const lease = overview.lease;
  const balance = overview.balance;
  const invoices = overview.invoices;

  return (
    <div className="flex flex-col gap-6">
      {header}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label={t.balance.outstanding}
          value={money.format(parseFloat(balance.outstanding))}
          tone={balanceTone(balance.outstanding)}
          icon={<WalletIcon className="size-4" />}
          hint={
            balanceTone(balance.outstanding) === 'negative'
              ? t.balance.due
              : t.balance.settled
          }
        />
        <KpiTile
          label={t.balance.paid}
          value={money.format(parseFloat(balance.paid))}
          icon={<ReceiptTextIcon className="size-4" />}
        />
        <KpiTile
          label={t.requests.openTitle}
          value={openCount}
          icon={<WrenchIcon className="size-4" />}
          hint={t.requests.ofTotal.replace('{count}', String(requests.length))}
        />
      </div>

      {/* My lease */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t.lease.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lease ? (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t.lease.unit}>
                {lease.unitNumber}
                <span className="text-muted-foreground">
                  {' · '}
                  {lease.buildingName}
                </span>
              </Field>
              <Field label={t.lease.status}>
                <LeaseStatusBadge status={lease.effectiveStatus} dict={dict} />
              </Field>
              <Field label={t.lease.term}>
                {fmtDate(lease.startDate)}
                {` ${t.lease.to} `}
                {fmtDate(lease.endDate)}
              </Field>
              <Field label={t.lease.rent}>
                <span className="tabular-nums">
                  {money.format(parseFloat(lease.rentAmount))}
                </span>
              </Field>
              <Field label={t.lease.deposit}>
                <span className="tabular-nums">
                  {money.format(parseFloat(lease.depositAmount))}
                </span>
              </Field>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.lease.none}</p>
          )}
        </CardContent>
      </Card>

      {/* My invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t.invoices.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <ReceiptTextIcon className="size-8 mx-auto mb-2 opacity-30" />
              {t.invoices.empty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-xs text-muted-foreground">
                    <th className="py-2 pe-4 text-start font-medium">
                      {t.invoices.dueDate}
                    </th>
                    <th className="py-2 pe-4 text-end font-medium">
                      {t.invoices.invoiced}
                    </th>
                    <th className="py-2 pe-4 text-end font-medium">
                      {t.invoices.paid}
                    </th>
                    <th className="py-2 pe-4 text-end font-medium">
                      {t.invoices.balance}
                    </th>
                    <th className="py-2 text-start font-medium">
                      {t.invoices.status}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2 pe-4">{fmtDate(inv.dueDate)}</td>
                      <td className="py-2 pe-4 text-end tabular-nums">
                        {money.format(parseFloat(inv.invoiced))}
                      </td>
                      <td className="py-2 pe-4 text-end tabular-nums">
                        {money.format(parseFloat(inv.paid))}
                      </td>
                      <td className="py-2 pe-4 text-end tabular-nums">
                        {money.format(parseFloat(inv.balance))}
                      </td>
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className={INVOICE_STATUS_STYLES[inv.status]}
                        >
                          {t.invoiceStatus[inv.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My maintenance requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {t.requests.title}
          </CardTitle>
          <Button
            size="sm"
            disabled={!canOpen}
            onClick={() => {
              reset(EMPTY_VALUES);
              setCreateOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" />
            {t.requests.new}
          </Button>
        </CardHeader>
        <CardContent>
          {!canOpen && (
            <p className="mb-3 text-xs text-muted-foreground">
              {t.requests.noLease}
            </p>
          )}
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
              {canOpen ? t.requests.emptyActive : t.requests.empty}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={REQUEST_STATUS_STYLES[r.status]}
                    >
                      {t.requestStatus[r.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={PRIORITY_STYLES[r.priority]}
                    >
                      {t.priority[r.priority]}
                    </Badge>
                    <span className="ms-auto text-xs text-muted-foreground">
                      {t.requests.unit} {r.unitNumber} · {fmtDate(r.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {r.title}
                  </p>
                  {r.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Your activity */}
      <ActivityCard
        title={t.yourActivity}
        empty={dict.dashboard.noActivity}
        loading={timelineLoading}
        events={events}
        isAr={isAr}
      />

      {/* Create request dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.form.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tmr-title">
                {t.form.titleLabel}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tmr-title"
                placeholder={t.form.titlePlaceholder}
                aria-invalid={!!errors.title}
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tmr-priority">{t.form.priorityLabel}</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tmr-priority" className="w-full">
                      <SelectValue>
                        {(value) =>
                          t.priority[value as MaintenanceRequestPriority] ??
                          value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {t.priority[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tmr-desc">{t.form.descriptionLabel}</Label>
              <Textarea
                id="tmr-desc"
                rows={4}
                placeholder={t.form.descriptionPlaceholder}
                {...register('description')}
              />
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  reset(EMPTY_VALUES);
                }}
              >
                {t.form.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.form.submitting : t.form.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function Field({
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

function LeaseStatusBadge({
  status,
  dict,
}: {
  status: LeaseStatus;
  dict: Dictionary;
}) {
  const styles: Record<LeaseStatus, string> = {
    draft: 'bg-muted text-muted-foreground border-transparent',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-amber-50 text-amber-700 border-amber-200',
    terminated: 'bg-muted text-muted-foreground border-transparent',
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {dict.dashboard.tenant.leaseStatus[status]}
    </Badge>
  );
}

function ActivityCard({
  title,
  empty,
  loading,
  events,
  isAr,
}: {
  title: string;
  empty: string;
  loading: boolean;
  events: { id: string; action: string; createdAt: string }[];
  isAr: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <ClockIcon className="size-8 mx-auto mb-2 opacity-30" />
            {empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">
                  {(() => {
                    const h = event.action.replace(/\./g, ' ');
                    return h.charAt(0).toUpperCase() + h.slice(1);
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                    locale: isAr ? ar : undefined,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
