'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ReceiptIcon,
} from 'lucide-react';

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
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  useListExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from '@/store/api/endpoints/expenses.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import { useListVendorsQuery } from '@/store/api/endpoints/vendors.api';
import { useListMaintenanceRequestsQuery } from '@/store/api/endpoints/maintenance-requests.api';
import { useListWorkOrdersQuery } from '@/store/api/endpoints/work-orders.api';
import type { ExpenseCategory, ExpenseResponse } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Category badge ───────────────────────────────────────────────────────────

const CATEGORIES: ExpenseCategory[] = [
  'repairs',
  'vendor_payment',
  'utilities',
  'taxes',
  'insurance',
  'other',
];

const CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  repairs: 'bg-orange-50 text-orange-700 border-orange-200',
  vendor_payment: 'bg-blue-50 text-blue-700 border-blue-200',
  utilities: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  taxes: 'bg-purple-50 text-purple-700 border-purple-200',
  insurance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  other: 'bg-muted text-muted-foreground border-transparent',
};

function CategoryBadge({
  category,
  labels,
}: {
  category: ExpenseCategory;
  labels: Dictionary['expenses']['category'];
}) {
  return (
    <Badge variant="outline" className={CATEGORY_STYLES[category]}>
      {labels[category] ?? category}
    </Badge>
  );
}

// ── Form schema ──────────────────────────────────────────────────────────────

const NONE = '__none__';

function buildExpenseSchema(
  errors: Dictionary['expenses']['dialog']['errors'],
) {
  return z.object({
    category: z.enum([
      'repairs',
      'vendor_payment',
      'utilities',
      'taxes',
      'insurance',
      'other',
    ]),
    amount: z
      .string()
      .min(1, errors.amountRequired)
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
        errors.amountInvalid,
      ),
    incurredAt: z.string().min(1, errors.incurredDateRequired),
    buildingId: z.string().optional(),
    vendorId: z.string().optional(),
    workOrderId: z.string().optional(),
    notes: z.string().optional(),
  });
}

type ExpenseFormValues = z.infer<ReturnType<typeof buildExpenseSchema>>;

const EMPTY_VALUES: ExpenseFormValues = {
  category: 'repairs',
  amount: '',
  incurredAt: '',
  buildingId: '',
  vendorId: '',
  workOrderId: '',
  notes: '',
};

// ── Shared form fields (create + edit dialogs) ────────────────────────────────

function ExpenseFormFields({
  idPrefix,
  register,
  control,
  errors,
  buildings,
  vendors,
  canLinkWorkOrder,
  maintenanceRequestId,
  onMaintenanceRequestChange,
  workOrders,
  setValue,
  getValues,
  dict,
}: {
  idPrefix: string;
  register: ReturnType<typeof useForm<ExpenseFormValues>>['register'];
  control: ReturnType<typeof useForm<ExpenseFormValues>>['control'];
  errors: ReturnType<typeof useForm<ExpenseFormValues>>['formState']['errors'];
  buildings: { id: string; name: string }[] | undefined;
  vendors: { id: string; companyName: string }[] | undefined;
  canLinkWorkOrder: boolean;
  maintenanceRequestId: string;
  onMaintenanceRequestChange: (id: string) => void;
  workOrders:
    { id: string; vendorId?: string | null; numberLabel: string }[] | undefined;
  setValue: ReturnType<typeof useForm<ExpenseFormValues>>['setValue'];
  getValues: ReturnType<typeof useForm<ExpenseFormValues>>['getValues'];
  dict: Dictionary;
}) {
  const { data: maintenanceRequests } = useListMaintenanceRequestsQuery(
    undefined,
    { skip: !canLinkWorkOrder },
  );
  const categoryLabels = dict.expenses.category;
  const t = dict.expenses.dialog;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-category`}>
          {t.category} <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={`${idPrefix}-category`} className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    !value
                      ? t.selectCategory
                      : (categoryLabels[value as ExpenseCategory] ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-amount`}>
          {t.amount} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-amount`}
          type="number"
          step="0.01"
          min="0"
          placeholder={t.amountPlaceholder}
          aria-invalid={!!errors.amount}
          {...register('amount')}
        />
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-incurredAt`}>
          {t.incurredDate} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-incurredAt`}
          type="date"
          aria-invalid={!!errors.incurredAt}
          {...register('incurredAt')}
        />
        {errors.incurredAt && (
          <p className="text-xs text-destructive">
            {errors.incurredAt.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-building`}>
          {t.building}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Controller
          control={control}
          name="buildingId"
          render={({ field }) => (
            <Select
              value={field.value || NONE}
              onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
            >
              <SelectTrigger id={`${idPrefix}-building`} className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === NONE
                      ? t.orgWideNoBuilding
                      : (buildings?.find((b) => b.id === value)?.name ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.orgWideNoBuilding}</SelectItem>
                {buildings?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-vendor`}>
          {t.vendor}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Controller
          control={control}
          name="vendorId"
          render={({ field }) => (
            <Select
              value={field.value || NONE}
              onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
            >
              <SelectTrigger id={`${idPrefix}-vendor`} className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === NONE
                      ? t.noVendor
                      : (vendors?.find((v) => v.id === value)?.companyName ??
                        value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.noVendor}</SelectItem>
                {vendors?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      {canLinkWorkOrder && (
        <div className="flex flex-col gap-1.5 rounded-lg border p-3">
          <Label>
            {t.workOrderSection.label}{' '}
            <span className="text-muted-foreground font-normal">
              {t.optional}
            </span>
          </Label>
          <p className="text-xs text-muted-foreground">
            {t.workOrderSection.hint}
          </p>
          <Select
            value={maintenanceRequestId || NONE}
            onValueChange={(v) =>
              onMaintenanceRequestChange(v && v !== NONE ? v : '')
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === NONE
                    ? t.workOrderSection.maintenanceRequestNone
                    : (maintenanceRequests?.find((r) => r.id === value)
                        ?.title ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>
                {t.workOrderSection.maintenanceRequestNone}
              </SelectItem>
              {maintenanceRequests?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Controller
            control={control}
            name="workOrderId"
            render={({ field }) => (
              <Select
                value={field.value || NONE}
                onValueChange={(v) => {
                  const next = v === NONE ? '' : (v ?? '');
                  field.onChange(next);
                  const workOrder = workOrders?.find((w) => w.id === next);
                  if (workOrder?.vendorId && !getValues('vendorId')) {
                    setValue('vendorId', workOrder.vendorId);
                  }
                }}
                disabled={!maintenanceRequestId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      !value || value === NONE
                        ? t.workOrderSection.workOrderNone
                        : (workOrders?.find((w) => w.id === value)
                            ?.numberLabel ?? value)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    {t.workOrderSection.workOrderNone}
                  </SelectItem>
                  {workOrders?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.numberLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          {t.notes}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder={t.notesPlaceholder}
          rows={2}
          {...register('notes')}
        />
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const ALL = '__all__';

interface ExpensesPageProps {
  /** When false (non-admin/finance), hide all write actions. */
  canWrite: boolean;
  /** Only org_admin can read Maintenance Requests/Work Orders to build the picker. */
  canLinkWorkOrder: boolean;
  dict: Dictionary;
}

export function ExpensesPage({
  canWrite,
  canLinkWorkOrder,
  dict,
}: ExpensesPageProps) {
  const t = dict.expenses;
  const categoryLabels = dict.expenses.category;
  const { data: expenses, isLoading, isError } = useListExpensesQuery();
  const { data: buildings } = useListBuildingsQuery();
  const { data: vendors } = useListVendorsQuery();

  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation();
  const [deleteExpense, { isLoading: deleting }] = useDeleteExpenseMutation();

  const [buildingFilter, setBuildingFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createMrId, setCreateMrId] = useState('');
  const [editTarget, setEditTarget] = useState<ExpenseResponse | null>(null);
  const [editMrId, setEditMrId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ExpenseResponse | null>(
    null,
  );

  const { data: createWorkOrders } = useListWorkOrdersQuery(
    { maintenanceRequestId: createMrId },
    { skip: !createMrId },
  );
  const { data: editWorkOrders } = useListWorkOrdersQuery(
    { maintenanceRequestId: editMrId },
    { skip: !editMrId },
  );

  const expenseSchema = useMemo(
    () => buildExpenseSchema(dict.expenses.dialog.errors),
    [dict],
  );

  const {
    register: regCreate,
    control: createControl,
    handleSubmit: handleCreate,
    reset: resetCreate,
    setValue: setCreateValue,
    getValues: getCreateValues,
    formState: { errors: createErrors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: EMPTY_VALUES,
  });

  const {
    register: regEdit,
    control: editControl,
    handleSubmit: handleEdit,
    reset: resetEdit,
    setValue: setEditValue,
    getValues: getEditValues,
    formState: { errors: editErrors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: EMPTY_VALUES,
  });

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

  async function onCreateSubmit(values: ExpenseFormValues) {
    try {
      await createExpense({
        category: values.category,
        amount: Number(values.amount),
        incurredAt: values.incurredAt,
        buildingId: values.buildingId || undefined,
        vendorId: values.vendorId || undefined,
        workOrderId: values.workOrderId || undefined,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success(t.dialog.createSuccess);
      setCreateOpen(false);
      resetCreate(EMPTY_VALUES);
      setCreateMrId('');
    } catch {
      toast.error(t.dialog.createError);
    }
  }

  function openEdit(expense: ExpenseResponse) {
    setEditTarget(expense);
    setEditMrId('');
    resetEdit({
      category: expense.category,
      amount: expense.amount,
      incurredAt: expense.incurredAt.slice(0, 10),
      buildingId: expense.buildingId ?? '',
      vendorId: expense.vendorId ?? '',
      workOrderId: expense.workOrderId ?? '',
      notes: expense.notes ?? '',
    });
  }

  async function onEditSubmit(values: ExpenseFormValues) {
    if (!editTarget) return;
    try {
      await updateExpense({
        id: editTarget.id,
        body: {
          category: values.category,
          amount: Number(values.amount),
          incurredAt: values.incurredAt,
          buildingId: values.buildingId || null,
          vendorId: values.vendorId || null,
          workOrderId: values.workOrderId || null,
          notes: values.notes || null,
        },
      }).unwrap();
      toast.success(t.dialog.updateSuccess);
      setEditTarget(null);
    } catch {
      toast.error(t.dialog.updateError);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id).unwrap();
      toast.success(t.deleteDialog.success);
      setDeleteTarget(null);
    } catch {
      toast.error(t.deleteDialog.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            {t.notBilledToTenantsNote}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              {t.readOnly}
            </Badge>
          )}
          {canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {t.newExpense}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {hasAnyExpenses && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-building">
              {t.filters.building}
            </Label>
            <Select
              value={buildingFilter}
              onValueChange={(val) => setBuildingFilter(val ?? ALL)}
            >
              <SelectTrigger id="expenses-filter-building" className="w-44">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.filters.allBuildings
                      : (buildingNameById.get(value) ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.filters.allBuildings}</SelectItem>
                {(buildings ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-category">
              {t.filters.category}
            </Label>
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val ?? ALL)}
            >
              <SelectTrigger id="expenses-filter-category" className="w-44">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.filters.allCategories
                      : (categoryLabels[value as ExpenseCategory] ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.filters.allCategories}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-from">{t.filters.from}</Label>
            <Input
              id="expenses-filter-from"
              type="date"
              className="w-40"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenses-filter-to">{t.filters.to}</Label>
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
              <TableHead>{t.table.category}</TableHead>
              <TableHead>{t.table.amount}</TableHead>
              <TableHead>{t.table.incurredDate}</TableHead>
              <TableHead>{t.table.building}</TableHead>
              <TableHead>{t.table.vendor}</TableHead>
              <TableHead>{t.table.workOrder}</TableHead>
              {canWrite && <TableHead className="w-10" />}
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
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.loadError}
                </TableCell>
              </TableRow>
            ) : !hasAnyExpenses ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ReceiptIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite ? t.emptyWrite : t.empty}
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.noMatch}
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <CategoryBadge
                      category={expense.category}
                      labels={categoryLabels}
                    />
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
                      : t.orgWide}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.vendorId
                      ? (vendorNameById.get(expense.vendorId) ??
                        expense.vendorId)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.workOrderNumberLabel ?? '—'}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t.table.actionsLabel}
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(expense)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(expense)}
                          >
                            <TrashIcon className="size-3.5 mr-1.5" />
                            {dict.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create Expense Dialog ──────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.newTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <ExpenseFormFields
              idPrefix="ce"
              register={regCreate}
              control={createControl}
              errors={createErrors}
              buildings={buildings}
              vendors={vendors}
              canLinkWorkOrder={canLinkWorkOrder}
              maintenanceRequestId={createMrId}
              onMaintenanceRequestChange={(id) => {
                setCreateMrId(id);
                setCreateValue('workOrderId', '');
              }}
              workOrders={createWorkOrders}
              setValue={setCreateValue}
              getValues={getCreateValues}
              dict={dict}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(EMPTY_VALUES);
                  setCreateMrId('');
                }}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.dialog.creating : t.dialog.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Expense Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.editTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <ExpenseFormFields
              idPrefix="ee"
              register={regEdit}
              control={editControl}
              errors={editErrors}
              buildings={buildings}
              vendors={vendors}
              canLinkWorkOrder={canLinkWorkOrder}
              maintenanceRequestId={editMrId}
              onMaintenanceRequestChange={(id) => {
                setEditMrId(id);
                setEditValue('workOrderId', '');
              }}
              workOrders={editWorkOrders}
              setValue={setEditValue}
              getValues={getEditValues}
              dict={dict}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.dialog.saving : dict.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t.deleteDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.deleteDialog.confirm.split('{category}')[0]}
              <span className="font-medium text-foreground">
                {deleteTarget && categoryLabels[deleteTarget.category]}
              </span>
              {t.deleteDialog.confirm.split('{category}')[1]}
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setDeleteTarget(null)}
            >
              {dict.common.cancel}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t.deleteDialog.deleting : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
