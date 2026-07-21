'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusIcon, LifeBuoyIcon, CheckIcon, CheckCheckIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

import {
  useListSupportTicketsQuery,
  useCreateSupportTicketMutation,
  useUpdateSupportTicketMutation,
} from '@/store/api/endpoints/support-tickets.api';
import type {
  SupportTicketCategory,
  SupportTicketResponse,
  SupportTicketStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Static option lists (labels resolved from the dictionary at render) ───────

// Maintenance is intentionally excluded from the CREATE form: a tenant's
// category:'maintenance' ticket can never be actioned by the maintenance role
// (resolve/close excludes them) — the real channel for that is a
// MaintenanceRequest, not a support ticket. Existing tickets already tagged
// 'maintenance' still render fine (CATEGORY_STYLES/t.categories keep the key).
const CATEGORIES: SupportTicketCategory[] = [
  'general',
  'billing',
  'technical',
  'other',
];

const CATEGORY_STYLES: Record<SupportTicketCategory, string> = {
  general: 'bg-muted text-muted-foreground border-transparent',
  billing: 'bg-blue-50 text-blue-700 border-blue-200',
  maintenance: 'bg-orange-50 text-orange-700 border-orange-200',
  technical: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-muted text-muted-foreground border-transparent',
};

const STATUS_STYLES: Record<SupportTicketStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  acknowledged: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground border-transparent',
};

// ── Form ──────────────────────────────────────────────────────────────────────

type TicketFormValues = {
  subject: string;
  description: string;
  category: SupportTicketCategory;
};

const EMPTY_VALUES: TicketFormValues = {
  subject: '',
  description: '',
  category: 'general',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface SupportPageProps {
  /**
   * True when the role may transition ticket status (acknowledge/resolve/close).
   * Creating a ticket is available to everyone and does not depend on this.
   */
  canWrite: boolean;
  locale: string;
  dict: Dictionary;
}

export function SupportPage({ canWrite, locale, dict }: SupportPageProps) {
  const t = dict.support;

  const { data: tickets, isLoading, isError } = useListSupportTicketsQuery();
  const [createTicket, { isLoading: creating }] =
    useCreateSupportTicketMutation();
  const [updateTicket] = useUpdateSupportTicketMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        subject: z.string().trim().min(1, t.validation.subject),
        description: z.string().trim().min(1, t.validation.description),
        category: z.enum([
          'general',
          'billing',
          'maintenance',
          'technical',
          'other',
        ]),
      }),
    [t],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [locale],
  );

  const hasAnyTickets = (tickets?.length ?? 0) > 0;

  async function onCreateSubmit(values: TicketFormValues) {
    try {
      await createTicket({
        subject: values.subject.trim(),
        description: values.description.trim(),
        category: values.category,
      }).unwrap();
      toast.success(t.createdToast);
      setCreateOpen(false);
      reset(EMPTY_VALUES);
    } catch {
      toast.error(t.createError);
    }
  }

  async function transition(id: string, status: SupportTicketStatus) {
    setPendingTicketId(id);
    try {
      await updateTicket({ id, body: { status } }).unwrap();
      toast.success(t.updatedToast);
    } catch {
      toast.error(t.updateError);
    } finally {
      setPendingTicketId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {/* Everyone (incl. tenants) can open a ticket. */}
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            reset(EMPTY_VALUES);
            setCreateOpen(true);
          }}
        >
          <PlusIcon />
          {t.newTicket}
        </Button>
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-4xl" />
                <Skeleton className="h-5 w-20 rounded-4xl" />
              </div>
              <Skeleton className="mt-3 h-5 w-1/2" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {t.loadError}
        </div>
      ) : !hasAnyTickets ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          <LifeBuoyIcon className="mx-auto mb-2 size-8 opacity-30" />
          {t.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets!.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              dict={dict}
              canWrite={canWrite}
              pending={pendingTicketId === ticket.id}
              onTransition={transition}
              formatDate={(iso) => dateFormatter.format(new Date(iso))}
            />
          ))}
        </div>
      )}

      {/* ── Create ticket dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.newTicket}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="st-subject">
                {t.subject} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="st-subject"
                placeholder={t.subjectPlaceholder}
                aria-invalid={!!errors.subject}
                {...register('subject')}
              />
              {errors.subject && (
                <p className="text-xs text-destructive">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="st-category">{t.category}</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="st-category" className="w-full">
                      <SelectValue>
                        {(value) =>
                          t.categories[value as SupportTicketCategory] ??
                          value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t.categories[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="st-description">
                {t.description} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="st-description"
                rows={4}
                placeholder={t.descriptionPlaceholder}
                aria-invalid={!!errors.description}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  reset(EMPTY_VALUES);
                }}
              >
                {t.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.submitting : t.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Ticket card ───────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  dict,
  canWrite,
  pending,
  onTransition,
  formatDate,
}: {
  ticket: SupportTicketResponse;
  dict: Dictionary;
  canWrite: boolean;
  pending: boolean;
  onTransition: (id: string, status: SupportTicketStatus) => void;
  formatDate: (iso: string) => string;
}) {
  const t = dict.support;
  const isClosed = ticket.status === 'closed';
  const showActions = canWrite && !isClosed;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={CATEGORY_STYLES[ticket.category]}>
          {t.categories[ticket.category]}
        </Badge>
        <Badge variant="outline" className={STATUS_STYLES[ticket.status]}>
          {t.status[ticket.status]}
        </Badge>
        <span className="ms-auto text-xs text-muted-foreground">
          {t.openedOn} {formatDate(ticket.createdAt)}
        </span>
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {ticket.subject}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {ticket.description}
        </p>
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {ticket.status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onTransition(ticket.id, 'acknowledged')}
            >
              <CheckIcon className="size-3.5" />
              {t.actions.acknowledge}
            </Button>
          )}
          {(ticket.status === 'open' || ticket.status === 'acknowledged') && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onTransition(ticket.id, 'resolved')}
            >
              <CheckCheckIcon className="size-3.5" />
              {t.actions.resolve}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onTransition(ticket.id, 'closed')}
          >
            {t.actions.close}
          </Button>
        </div>
      )}
    </div>
  );
}
