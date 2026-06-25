'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useExpenses } from '@/hooks/use-expenses';
import { useExpenseCategories } from '@/hooks/use-expense-categories';
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
import { Plus, Trash2, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  expenseCreateRequestSchema,
  type ExpenseCreateRequest,
  type ExpenseResponse,
} from '@repo/contracts';

function formatUSD(value: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(value));
}

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseCreateRequest>;
  onSubmit: (data: ExpenseCreateRequest) => Promise<void>;
  categories: Array<{ id: string; name: string; color: string | null }>;
  isLoading?: boolean;
}

function ExpenseForm({
  defaultValues,
  onSubmit,
  categories,
  isLoading,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof expenseCreateRequestSchema>,
    unknown,
    ExpenseCreateRequest
  >({
    resolver: zodResolver(expenseCreateRequestSchema),
    defaultValues: {
      date: today(),
      recurrence: 'NONE',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          placeholder="e.g. Monthly rent"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="amount">Amount (USD) *</Label>
          <Input
            id="amount"
            placeholder="0.00"
            {...register('amount')}
          />
          {errors.amount && (
            <p className="text-xs text-red-500">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && (
            <p className="text-xs text-red-500">{errors.date.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Category</Label>
          <Select
            onValueChange={(v) =>
              setValue('categoryId', v === 'none' ? undefined : v)
            }
            defaultValue={defaultValues?.categoryId ?? 'none'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No category —</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Recurrence</Label>
          <Select
            onValueChange={(v) =>
              setValue('recurrence', v as ExpenseCreateRequest['recurrence'])
            }
            defaultValue={defaultValues?.recurrence ?? 'NONE'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((r) => (
                <SelectItem key={r} value={r}>
                  {r === 'NONE' ? 'One-time' : r.charAt(0) + r.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          placeholder="Optional notes"
          {...register('notes')}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || isLoading}
        className="w-full"
      >
        {isSubmitting ? 'Saving…' : 'Save Expense'}
      </Button>
    </form>
  );
}

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseResponse | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { expenses, meta, isLoading, createExpense, updateExpense, deleteExpense } =
    useExpenses({ search: search || undefined });
  const { categories, seedDefaults } = useExpenseCategories();

  const handleCreate = async (data: ExpenseCreateRequest) => {
    try {
      await createExpense(data);
      toast.success('Expense added');
      setOpen(false);
    } catch {
      toast.error('Failed to add expense');
    }
  };

  const handleUpdate = async (data: ExpenseCreateRequest) => {
    if (!editing) return;
    try {
      await updateExpense(editing.id, data);
      toast.success('Expense updated');
      setEditing(null);
    } catch {
      toast.error('Failed to update expense');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget);
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} total expenses
          </p>
        </div>
        <div className="flex gap-2">
          {categories?.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedDefaults().then(() => toast.success('Default categories added'))}
            >
              Seed categories
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                onSubmit={handleCreate}
                categories={categories ?? []}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search expenses…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* List */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : !expenses?.length ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No expenses yet.</p>
              <Button
                variant="link"
                className="mt-2 text-primary"
                onClick={() => setOpen(true)}
              >
                Add your first expense
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {expense.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{expense.date}</span>
                      {expense.category && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            borderColor: expense.category.color ?? '#7C4DFF',
                            color: expense.category.color ?? '#7C4DFF',
                          }}
                        >
                          {expense.category.name}
                        </Badge>
                      )}
                      {expense.recurrence !== 'NONE' && (
                        <Badge variant="outline" className="text-xs">
                          {expense.recurrence.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {formatUSD(expense.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(expense)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(expense.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              defaultValues={{
                description: editing.description,
                amount: editing.amount,
                date: editing.date,
                categoryId: editing.categoryId ?? undefined,
                recurrence: editing.recurrence,
                notes: editing.notes ?? undefined,
              }}
              onSubmit={handleUpdate}
              categories={categories ?? []}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete expense?"
        description="This expense will be permanently removed. This action cannot be undone."
        confirmLabel="Yes, delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
