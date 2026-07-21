'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusIcon, WrenchIcon } from 'lucide-react';

import {
  useGetTenantOverviewQuery,
  useCreateTenantMaintenanceRequestMutation,
} from '@/store/api/endpoints/tenant.api';
import type {
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';
import { getPortalDict } from '@/components/portal/portal-dict';
import { canOpenRequest } from '@/lib/tenant-overview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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

// Mirrors the tenant-dashboard request palette.
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

type Props = { locale: string; dict: Dictionary };

export function PortalSupport({ locale, dict }: Props) {
  const t = getPortalDict(dict, locale).support;
  const { data: overview, isLoading, isError } = useGetTenantOverviewQuery();
  const [createRequest, { isLoading: creating }] =
    useCreateTenantMaintenanceRequestMutation();
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

  const requests = overview?.maintenanceRequests ?? [];
  const canOpen = canOpenRequest(overview);

  async function onSubmit(values: RequestFormValues) {
    try {
      await createRequest({
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        priority: values.priority,
      }).unwrap();
      toast.success(t.created);
      setCreateOpen(false);
      reset(EMPTY_VALUES);
    } catch {
      toast.error(t.createError);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button
          disabled={!canOpen}
          onClick={() => {
            reset(EMPTY_VALUES);
            setCreateOpen(true);
          }}
          className="bg-gradient-to-br from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600"
        >
          <PlusIcon className="size-4" />
          {t.new}
        </Button>
      </section>

      {!canOpen && !isLoading && (
        <p className="text-xs text-muted-foreground">{t.noLease}</p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : isError ? (
        <Card className="ring-amber-200/50 dark:ring-amber-900/30">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {dict.dashboard.tenant.loadError}
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="border-dashed ring-amber-200/60 dark:ring-amber-900/30">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
              <WrenchIcon className="size-7" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              {canOpen ? t.emptyActive : t.empty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Card className="ring-foreground/10">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={REQUEST_STATUS_STYLES[r.status]}
                    >
                      {t.status[r.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={PRIORITY_STYLES[r.priority]}
                    >
                      {t.priority[r.priority]}
                    </Badge>
                    <span className="ms-auto text-xs text-muted-foreground">
                      {t.unit} {r.unitNumber} · {fmtDate(r.createdAt)}
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
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Create request dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.form.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="psr-title">
                {t.form.titleLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="psr-title"
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
              <Label htmlFor="psr-priority">{t.form.priorityLabel}</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="psr-priority" className="w-full">
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
              <Label htmlFor="psr-desc">{t.form.descriptionLabel}</Label>
              <Textarea
                id="psr-desc"
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
