'use client';

import { useMemo, useState } from 'react';
import { ReceiptIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

import { useListExpensesQuery } from '@/store/api/endpoints/expenses.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import { useListVendorsQuery } from '@/store/api/endpoints/vendors.api';
import type { ExpenseCategory } from '@/types/api';

// ── Category badge ───────────────────────────────────────────────────────────

const CATEGORIES: ExpenseCategory[] = [
  'repairs',
  'vendor_payment',
  'utilities',
  'taxes',
  'insurance',
  'other',
];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  repairs: 'Repairs',
  vendor_payment: 'Vendor payment',
  utilities: 'Utilities',
  taxes: 'Taxes',
  insurance: 'Insurance',
  other: 'Other',
};

const CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  repairs: 'bg-orange-50 text-orange-700 border-orange-200',
  vendor_payment: 'bg-blue-50 text-blue-700 border-blue-200',
  utilities: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  taxes: 'bg-purple-50 text-purple-700 border-purple-200',
  insurance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  other: 'bg-muted text-muted-foreground border-transparent',
};

function CategoryBadge({ category }: { category: ExpenseCategory }) {
  return (
    <Badge variant="outline" className={CATEGORY_STYLES[category]}>
      {CATEGORY_LABELS[category] ?? category}
    </Badge>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const ALL = '__all__';

export function ExpensesPage() {
  const { data: expenses, isLoading, isError } = useListExpensesQuery();
  const { data: buildings } = useListBuildingsQuery();
  const { data: vendors } = useListVendorsQuery();

  const [buildingFilter, setBuildingFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const buildingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of buildings ?? []) map.set(b.id, b.name);
    return map;
  }, [buildings]);

  const vendorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vendors ?? []) map.set(v.id, v.companyName);
    return map;
  }, [vendors]);

  const filteredExpenses = useMemo(() => {
    return (expenses ?? []).filter((expense) => {
      if (buildingFilter !== ALL && expense.buildingId !== buildingFilter) {
        return false;
      }
      if (categoryFilter !== ALL && expense.category !== categoryFilter) {
        return false;
      }
      const incurredAt = expense.incurredAt.slice(0, 10);
      if (fromDate && incurredAt < fromDate) return false;
      if (toDate && incurredAt > toDate) return false;
      return true;
    });
  }, [expenses, buildingFilter, categoryFilter, fromDate, toDate]);

  const hasAnyExpenses = (expenses?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Money spent running your organization&apos;s properties.
          </p>
        </div>
      </div>

      {/* Filters */}
      {hasAnyExpenses && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-building">Building</Label>
            <Select
              value={buildingFilter}
              onValueChange={(val) => setBuildingFilter(val ?? ALL)}
            >
              <SelectTrigger id="expenses-filter-building" className="w-44">
                <SelectValue placeholder="All buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All buildings</SelectItem>
                {(buildings ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-category">Category</Label>
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val ?? ALL)}
            >
              <SelectTrigger id="expenses-filter-category" className="w-44">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-from">From</Label>
            <Input
              id="expenses-filter-from"
              type="date"
              className="w-40"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-to">To</Label>
            <Input
              id="expenses-filter-to"
              type="date"
              className="w-40"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Expenses table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Incurred date</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Work order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  Failed to load expenses. Please try again.
                </TableCell>
              </TableRow>
            ) : !hasAnyExpenses ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ReceiptIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No expenses recorded yet.
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No expenses match the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <CategoryBadge category={expense.category} />
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {expense.amount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(expense.incurredAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.buildingId
                      ? (buildingNameById.get(expense.buildingId) ??
                        expense.buildingId)
                      : 'Org-wide'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.vendorId
                      ? (vendorNameById.get(expense.vendorId) ??
                        expense.vendorId)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.workOrderId ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
