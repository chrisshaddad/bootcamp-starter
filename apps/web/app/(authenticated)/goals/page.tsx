'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGoals } from '@/hooks/use-goals';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, Target } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  goalCreateRequestSchema,
  type GoalCreateRequest,
  type GoalResponse,
} from '@repo/contracts';
import { cn } from '@/lib/utils';

function formatUSD(value: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(value));
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  REVENUE: 'Revenue Target',
  GROSS_PROFIT: 'Gross Profit Target',
  NET_PROFIT: 'Net Profit Target',
  EXPENSE_LIMIT: 'Expense Limit',
};

const GOAL_PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

interface GoalFormProps {
  defaultValues?: Partial<GoalCreateRequest>;
  onSubmit: (data: GoalCreateRequest) => Promise<void>;
}

/** Compute end date from startDate + period (last day of the period) */
function computeEndDate(startDate: string, period: string): string {
  if (!startDate) return '';
  const [y, m] = startDate.split('-').map(Number);
  if (!y || !m) return '';
  let endDate: Date;
  if (period === 'MONTHLY') {
    // Last day of the same month
    endDate = new Date(y, m, 0);
  } else if (period === 'QUARTERLY') {
    // Last day of the 3rd month from start
    endDate = new Date(y, m + 2, 0);
  } else {
    // YEARLY — last day of the 12th month from start
    endDate = new Date(y, m + 11, 0);
  }
  return endDate.toISOString().split('T')[0]!;
}

function GoalForm({ defaultValues, onSubmit }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalCreateRequest>({
    resolver: zodResolver(goalCreateRequestSchema),
    defaultValues,
  });

  const startDate = watch('startDate');
  const period = watch('period');
  const derivedEndDate =
    startDate && period ? computeEndDate(startDate, period) : '';

  // Keep the hidden endDate field in sync
  useEffect(() => {
    if (derivedEndDate) setValue('endDate', derivedEndDate);
  }, [derivedEndDate, setValue]);

  const fmtEndDate = (iso: string) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Hidden end date — computed automatically */}
      <input type="hidden" {...register('endDate')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Goal Type *</Label>
          <Select
            onValueChange={(v) =>
              setValue('type', v as GoalCreateRequest['type'])
            }
            defaultValue={defaultValues?.type}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GOAL_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Period *</Label>
          <Select
            onValueChange={(v) =>
              setValue('period', v as GoalCreateRequest['period'])
            }
            defaultValue={defaultValues?.period}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GOAL_PERIOD_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="targetAmount">Target Amount (USD) *</Label>
        <Input
          id="targetAmount"
          placeholder="10000.00"
          {...register('targetAmount')}
        />
        {errors.targetAmount && (
          <p className="text-xs text-destructive">
            {errors.targetAmount.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input id="startDate" type="date" {...register('startDate')} />
          {errors.startDate && (
            <p className="text-xs text-destructive">
              {errors.startDate.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label>End Date</Label>
          <div
            className={cn(
              'flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm',
              derivedEndDate ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {derivedEndDate ? (
              fmtEndDate(derivedEndDate)
            ) : (
              <span className="text-xs">Set start date &amp; period</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            {period === 'MONTHLY' && 'Ends at the last day of the start month'}
            {period === 'QUARTERLY' && 'Ends 3 months after the start date'}
            {period === 'YEARLY' && 'Ends 12 months after the start date'}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Optional description"
          {...register('description')}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : 'Save Goal'}
      </Button>
    </form>
  );
}

export default function GoalsPage() {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editing, setEditing] = useState<GoalResponse | null>(null);

  const { goals, meta, isLoading, createGoal, updateGoal, deleteGoal } =
    useGoals();

  const handleCreate = async (data: GoalCreateRequest) => {
    try {
      await createGoal(data);
      toast.success('Goal created');
      setOpen(false);
    } catch {
      toast.error('Failed to create goal');
    }
  };

  const handleUpdate = async (data: GoalCreateRequest) => {
    if (!editing) return;
    try {
      await updateGoal(editing.id, data);
      toast.success('Goal updated');
      setEditing(null);
    } catch {
      toast.error('Failed to update goal');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGoal(deleteTarget);
      toast.success('Goal deleted');
    } catch {
      toast.error('Failed to delete goal');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} goals set
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set a Goal</DialogTitle>
            </DialogHeader>
            <GoalForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : !goals?.length ? (
            <div className="p-12 text-center">
              <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No goals set yet.</p>
              <Button
                variant="link"
                className="mt-2 text-primary"
                onClick={() => setOpen(true)}
              >
                Set your first goal
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {goals.map((goal) => {
                const pct = goal.progressPct ?? null;
                const isExpenseLimit = goal.type === 'EXPENSE_LIMIT';

                return (
                  <div key={goal.id} className="p-4 hover:bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {GOAL_TYPE_LABELS[goal.type] ?? goal.type}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {GOAL_PERIOD_LABELS[goal.period] ?? goal.period}
                          </Badge>
                          {!goal.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground">
                            {goal.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {goal.startDate} → {goal.endDate} ·{' '}
                          <span className="font-medium text-foreground">
                            Target: {formatUSD(goal.targetAmount)}
                          </span>
                        </p>
                        {pct !== null && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {goal.currentAmount
                                  ? formatUSD(goal.currentAmount)
                                  : '—'}{' '}
                                / {formatUSD(goal.targetAmount)}
                              </span>
                              <span
                                className={cn(
                                  'font-medium',
                                  isExpenseLimit && pct > 100
                                    ? 'text-destructive'
                                    : pct >= 100
                                      ? 'text-[#34D39A]'
                                      : 'text-muted-foreground',
                                )}
                              >
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-1.5 rounded-full',
                                  isExpenseLimit && pct > 100
                                    ? 'bg-destructive'
                                    : pct >= 100
                                      ? 'bg-[#34D39A]'
                                      : 'bg-primary',
                                )}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(goal)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(goal.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          {editing && (
            <GoalForm
              defaultValues={{
                type: editing.type,
                period: editing.period,
                targetAmount: editing.targetAmount,
                startDate: editing.startDate,
                endDate: editing.endDate,
                description: editing.description ?? undefined,
              }}
              onSubmit={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Goal"
        description="This goal will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
