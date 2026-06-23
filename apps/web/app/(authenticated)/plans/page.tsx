'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ClipboardList, Plus, Tag } from 'lucide-react';
import { z } from 'zod';
import {
  planCreateRequestSchema,
  planUpdateRequestSchema,
} from '@repo/contracts';
import { usePlans, useCreatePlan, useUpdatePlan } from '@/hooks/use-plans';
import { ApiError } from '@/lib/api';
import type { PlanResponse } from '@repo/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

type ActiveFilter = 'all' | 'active' | 'inactive';

const STATUS_COLORS = {
  active: 'bg-primary-100 text-primary-base',
  inactive: 'bg-gray-200 text-gray-700',
} as const;

function StatusBadge({ isActive }: { isActive: boolean }) {
  const key = isActive ? 'active' : 'inactive';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[key]}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  if (days % 7 === 0) return `${days / 7} week${days / 7 > 1 ? 's' : ''}`;
  return `${days} days`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

// Form schemas: extend contract schemas with z.coerce for HTML inputs,
// and accept price in dollars (the submit handler converts to cents)
const createPlanFormSchema = planCreateRequestSchema
  .omit({ price: true, durationDays: true })
  .extend({
    durationDays: z.coerce
      .number()
      .int('Must be a whole number')
      .positive('Duration must be at least 1 day'),
    price: z.coerce.number().nonnegative('Price must be non-negative'),
  });
type CreatePlanFormInput = z.input<typeof createPlanFormSchema>;
type CreatePlanFormOutput = z.output<typeof createPlanFormSchema>;

const editPlanFormSchema = planUpdateRequestSchema
  .omit({ price: true, durationDays: true, isActive: true })
  .extend({
    durationDays: z.coerce
      .number()
      .int('Must be a whole number')
      .positive('Duration must be at least 1 day'),
    price: z.coerce.number().nonnegative('Price must be non-negative'),
  });
type EditPlanFormInput = z.input<typeof editPlanFormSchema>;
type EditPlanFormOutput = z.output<typeof editPlanFormSchema>;

function AddPlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { create } = useCreatePlan();

  const form = useForm<CreatePlanFormInput, unknown, CreatePlanFormOutput>({
    resolver: zodResolver(createPlanFormSchema),
    mode: 'onTouched',
    defaultValues: { name: '', description: '', durationDays: 30, price: 0 },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      await create({
        name: data.name,
        description: data.description || undefined,
        durationDays: data.durationDays,
        price: Math.round(data.price * 100), // dollars → cents
      });
      toast.success('Plan created successfully');
      onOpenChange(false);
      form.reset();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to create plan',
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
        if (!o) form.reset();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Plan</DialogTitle>
            <DialogDescription>
              Create a new membership plan for your gym catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="add-name">
                Plan Name <span className="text-error">*</span>
              </Label>
              <Input
                id="add-name"
                placeholder="e.g. Monthly Premium"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-error">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                placeholder="Brief description of what's included"
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="add-duration">
                  Duration (days) <span className="text-error">*</span>
                </Label>
                <Input
                  id="add-duration"
                  type="number"
                  min={1}
                  placeholder="30"
                  {...form.register('durationDays')}
                />
                {form.formState.errors.durationDays && (
                  <p className="text-xs text-error">
                    {form.formState.errors.durationDays.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="add-price">
                  Price (USD) <span className="text-error">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    $
                  </span>
                  <Input
                    id="add-price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="29.99"
                    className="pl-7"
                    {...form.register('price')}
                  />
                </div>
                {form.formState.errors.price && (
                  <p className="text-xs text-error">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>
            </div>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({
  plan,
  onClose,
}: {
  plan: PlanResponse;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { update } = useUpdatePlan();

  const form = useForm<EditPlanFormInput, unknown, EditPlanFormOutput>({
    resolver: zodResolver(editPlanFormSchema),
    mode: 'onTouched',
    defaultValues: {
      name: plan.name,
      description: plan.description ?? '',
      durationDays: plan.durationDays,
      price: plan.price / 100, // cents → dollars for display
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      await update(plan.id, {
        name: data.name,
        description: data.description || null,
        durationDays: data.durationDays,
        price: Math.round(data.price * 100), // dollars → cents
      });
      toast.success('Plan updated successfully');
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update plan',
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    try {
      await update(plan.id, { isActive: !plan.isActive });
      toast.success(plan.isActive ? 'Plan deactivated' : 'Plan reactivated');
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update plan status',
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Plan</DialogTitle>
              <DialogDescription>
                Update the details of this membership plan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">
                  Plan Name <span className="text-error">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="e.g. Monthly Premium"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-error">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Brief description of what's included"
                  rows={3}
                  {...form.register('description')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-duration">
                    Duration (days) <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min={1}
                    {...form.register('durationDays')}
                  />
                  {form.formState.errors.durationDays && (
                    <p className="text-xs text-error">
                      {form.formState.errors.durationDays.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-price">
                    Price (USD) <span className="text-error">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      $
                    </span>
                    <Input
                      id="edit-price"
                      type="number"
                      min={0}
                      step={0.01}
                      className="pl-7"
                      {...form.register('price')}
                    />
                  </div>
                  {form.formState.errors.price && (
                    <p className="text-xs text-error">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-xs text-gray-500">
                    {plan.isActive
                      ? 'Visible in the plan catalog.'
                      : 'Hidden from the plan catalog.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isTogglingStatus}
                  onClick={() => setShowConfirmDialog(true)}
                  className={
                    plan.isActive
                      ? 'border-error text-error hover:bg-red-50'
                      : 'border-primary-base text-primary-base hover:bg-primary-100'
                  }
                >
                  {isTogglingStatus
                    ? 'Updating...'
                    : plan.isActive
                      ? 'Deactivate'
                      : 'Reactivate'}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-base hover:bg-primary-400 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {plan.isActive ? 'Deactivate Plan' : 'Reactivate Plan'}
            </DialogTitle>
            <DialogDescription>
              {plan.isActive
                ? `Are you sure you want to deactivate "${plan.name}"? It will be hidden from the plan catalog.`
                : `Are you sure you want to reactivate "${plan.name}"? It will become visible in the plan catalog.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isTogglingStatus}
            >
              Cancel
            </Button>
            <Button
              className={
                plan.isActive
                  ? 'bg-error hover:bg-error/90 text-white'
                  : 'bg-primary-base hover:bg-primary-400 text-white'
              }
              onClick={async () => {
                setShowConfirmDialog(false);
                await handleToggleStatus();
              }}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus
                ? plan.isActive
                  ? 'Deactivating...'
                  : 'Reactivating...'
                : plan.isActive
                  ? 'Deactivate'
                  : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PlansPage() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanResponse | null>(null);

  const isActiveFilter =
    activeFilter === 'all' ? undefined : activeFilter === 'active';

  const { plans, total, isLoading, error } = usePlans({
    isActive: isActiveFilter,
    page,
  });
  const totalPages = Math.ceil((total ?? 0) / 20);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your gym&apos;s membership plan catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={activeFilter}
            onValueChange={(v) => {
              setActiveFilter(v as ActiveFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="gap-2 bg-primary-base hover:bg-primary-400 text-white"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Plans
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-10 text-center text-error">
              Failed to load plans
            </div>
          ) : !plans?.length ? (
            <div className="py-10 text-center text-gray-500">
              <Tag className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p>No plans found</p>
              <p className="mt-1 text-xs">
                Create your first membership plan to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer"
                    onClick={() => setEditingPlan(plan)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {plan.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-gray-500">
                      {plan.description ?? (
                        <span className="italic text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatDuration(plan.durationDays)}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {formatPrice(plan.price)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={plan.isActive} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!error && total !== undefined && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of{' '}
                {total}
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

      <AddPlanDialog open={showAddDialog} onOpenChange={setShowAddDialog} />

      {editingPlan && (
        <EditPlanDialog
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
        />
      )}
    </div>
  );
}
