'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { CreditCard, Plus, XCircle } from 'lucide-react';
import type { SubscriptionResponse, SubscriptionStatus } from '@repo/contracts';
import {
  useSubscriptions,
  useCreateSubscription,
  useCancelSubscription,
  SUBSCRIPTIONS_PAGE_SIZE,
} from '@/hooks/use-subscriptions';
import { usePlans } from '@/hooks/use-plans';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Adds days in UTC to avoid DST drift, returns YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  ACTIVE: { bg: 'bg-primary-100 text-primary-base', label: 'Active' },
  EXPIRED: { bg: 'bg-gray-200 text-gray-600', label: 'Expired' },
  CANCELLED: { bg: 'bg-red-100 text-red-700', label: 'Cancelled' },
};

function SubscriptionStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    bg: 'bg-gray-200 text-gray-700',
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}
    >
      {style.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Add Subscription Dialog
// ---------------------------------------------------------------------------

const addSubFormSchema = z.object({
  planId: z.string().uuid('Please select a plan'),
});
type AddSubFormValues = z.infer<typeof addSubFormSchema>;

function AddSubscriptionDialog({
  open,
  onOpenChange,
  memberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
}) {
  const { create } = useCreateSubscription(memberId);
  const { plans, isLoading: plansLoading } = usePlans({ isActive: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);

  const form = useForm<AddSubFormValues>({
    resolver: zodResolver(addSubFormSchema),
    mode: 'onTouched',
    defaultValues: { planId: '' },
  });

  const watchedPlanId = form.watch('planId');
  const selectedPlan = plans?.find((p) => p.id === watchedPlanId);
  const computedEndDate = selectedPlan
    ? addDays(todayISO, selectedPlan.durationDays)
    : null;

  const noActivePlans = !plansLoading && (!plans || plans.length === 0);

  const resetForm = () => form.reset({ planId: '' });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      await create({ memberId, planId: data.planId });
      toast.success('Subscription created');
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to create subscription',
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
            <DialogDescription>
              Assign a membership plan to this member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {noActivePlans && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                No active plans available. Create an active plan first.
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="sub-plan">
                Plan <span className="text-error">*</span>
              </Label>
              <Controller
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={plansLoading || noActivePlans}
                  >
                    <SelectTrigger id="sub-plan">
                      <SelectValue
                        placeholder={
                          plansLoading ? 'Loading plans…' : 'Select a plan'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {plans?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatPrice(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.planId && (
                <p className="text-xs text-error">
                  {form.formState.errors.planId.message}
                </p>
              )}
            </div>

            {selectedPlan && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Price (snapshot)</span>
                  <span className="font-medium">
                    {formatPrice(selectedPlan.price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">
                    {selectedPlan.durationDays} days
                  </span>
                </div>
                {computedEndDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">End date</span>
                    <span className="font-medium">
                      {formatDate(computedEndDate)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-base hover:bg-primary-400 text-white"
              disabled={isSubmitting || noActivePlans}
            >
              {isSubmitting ? 'Creating…' : 'Create Subscription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Cancel Confirmation Dialog
// ---------------------------------------------------------------------------

function CancelSubscriptionDialog({
  subscription,
  onClose,
}: {
  subscription: SubscriptionResponse | null;
  onClose: () => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const { cancel } = useCancelSubscription(subscription?.memberId ?? '');

  const handleCancel = async () => {
    if (!subscription) return;
    setIsCancelling(true);
    try {
      await cancel(subscription.id);
      toast.success('Subscription cancelled');
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to cancel subscription',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={!!subscription} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the{' '}
            <strong>{subscription?.plan?.name ?? 'this'}</strong> subscription?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCancelling}>
            Keep
          </Button>
          <Button
            className="bg-error hover:bg-error/90 text-white"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling…' : 'Cancel Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Subscriptions Panel (exported)
// ---------------------------------------------------------------------------

/** Displays a member's subscription history and an Add Subscription action */
export function SubscriptionsPanel({ memberId }: { memberId: string }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'ALL'>(
    'ALL',
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SubscriptionResponse | null>(
    null,
  );

  const { subscriptions, total, isLoading, error } = useSubscriptions(
    memberId,
    {
      page,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    },
  );

  const totalPages = Math.ceil((total ?? 0) / SUBSCRIPTIONS_PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Subscriptions
              {total !== undefined && (
                <span className="text-sm font-normal text-gray-500">
                  ({total} total)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as SubscriptionStatus | 'ALL');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="gap-2 bg-primary-base hover:bg-primary-400 text-white"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add Subscription
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center text-error">
              Failed to load subscriptions
            </div>
          ) : !subscriptions?.length ? (
            <div className="py-8 text-center text-gray-500">
              <CreditCard className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p>No subscriptions yet</p>
              <p className="mt-1 text-xs">
                Add a subscription to track this member&apos;s membership
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-gray-900">
                      {sub.plan?.name ?? (
                        <span className="italic text-gray-400">
                          Plan removed
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatDate(sub.startDate)}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatDate(sub.endDate)}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatPrice(sub.price)}
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={sub.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {sub.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-error hover:bg-red-50 hover:text-error"
                          onClick={() => setCancelTarget(sub)}
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!error && total !== undefined && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * SUBSCRIPTIONS_PAGE_SIZE + 1}–
                {Math.min(page * SUBSCRIPTIONS_PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddSubscriptionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        memberId={memberId}
      />

      <CancelSubscriptionDialog
        subscription={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}
