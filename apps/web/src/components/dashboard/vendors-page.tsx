'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  MoreHorizontalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  WrenchIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  useListVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} from '@/store/api/endpoints/vendors.api';
import type { VendorResponse, VendorServiceType } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Services-offered ─────────────────────────────────────────────────────────

const SERVICE_TYPES: VendorServiceType[] = [
  'plumbing',
  'electrical',
  'cleaning',
  'landscaping',
  'hvac',
  'general_maintenance',
  'other',
];

function ServicesOfferedBadges({
  services,
  labels,
}: {
  services: VendorServiceType[];
  labels: Dictionary['vendors']['serviceType'];
}) {
  if (services.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((service) => (
        <Badge key={service} variant="secondary" className="text-xs">
          {labels[service] ?? service}
        </Badge>
      ))}
    </div>
  );
}

function ServicesOfferedPicker({
  selected,
  onToggle,
  labels,
}: {
  selected: VendorServiceType[];
  onToggle: (service: VendorServiceType) => void;
  labels: Dictionary['vendors']['serviceType'];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SERVICE_TYPES.map((service) => {
        const active = selected.includes(service);
        return (
          <button
            key={service}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(service)}
            className={[
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-transparent text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {labels[service]}
          </button>
        );
      })}
    </div>
  );
}

// ── Zod schema ────────────────────────────────────────────────────────────────

function buildVendorSchema(t: Dictionary['vendors']['dialog']) {
  return z.object({
    companyName: z.string().min(1, t.companyNameRequired),
    contactName: z.string().optional(),
    email: z.string().email(t.invalidEmail).optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  });
}

type VendorFormValues = z.infer<ReturnType<typeof buildVendorSchema>>;

const EMPTY_VALUES: VendorFormValues = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

// ── Main component ────────────────────────────────────────────────────────────

interface VendorsPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
  dict: Dictionary;
}

export function VendorsPage({ canWrite, dict }: VendorsPageProps) {
  const t = dict.vendors;
  const { data: vendors, isLoading, isError } = useListVendorsQuery();
  const [createVendor, { isLoading: creating }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: updating }] = useUpdateVendorMutation();
  const [deleteVendor, { isLoading: deleting }] = useDeleteVendorMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [createServices, setCreateServices] = useState<VendorServiceType[]>([]);
  const [editTarget, setEditTarget] = useState<VendorResponse | null>(null);
  const [editServices, setEditServices] = useState<VendorServiceType[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<VendorResponse | null>(null);

  const vendorSchema = useMemo(() => buildVendorSchema(t.dialog), [t.dialog]);

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: EMPTY_VALUES,
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: EMPTY_VALUES,
  });

  function toggleCreateService(service: VendorServiceType) {
    setCreateServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  }

  function toggleEditService(service: VendorServiceType) {
    setEditServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  }

  async function onCreateSubmit(values: VendorFormValues) {
    try {
      await createVendor({
        companyName: values.companyName,
        contactName: values.contactName || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        servicesOffered: createServices,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success(t.dialog.createdToast);
      setCreateOpen(false);
      resetCreate(EMPTY_VALUES);
      setCreateServices([]);
    } catch {
      toast.error(t.dialog.createErrorToast);
    }
  }

  function openEdit(vendor: VendorResponse) {
    setEditTarget(vendor);
    setEditServices(vendor.servicesOffered);
    resetEdit({
      companyName: vendor.companyName,
      contactName: vendor.contactName ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      notes: vendor.notes ?? '',
    });
  }

  async function onEditSubmit(values: VendorFormValues) {
    if (!editTarget) return;
    try {
      await updateVendor({
        id: editTarget.id,
        body: {
          companyName: values.companyName,
          contactName: values.contactName || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
          servicesOffered: editServices,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success(t.dialog.updatedToast);
      setEditTarget(null);
    } catch {
      toast.error(t.dialog.updateErrorToast);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteVendor(deleteTarget.id).unwrap();
      toast.success(t.dialog.deletedToast);
      setDeleteTarget(null);
    } catch {
      toast.error(t.dialog.deleteErrorToast);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite ? t.subtitleWrite : t.subtitleReadOnly}
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
              {t.addVendor}
            </Button>
          )}
        </div>
      </div>

      {/* Vendors table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.table.companyName}</TableHead>
              <TableHead>{t.table.contactName}</TableHead>
              <TableHead>{t.table.phoneEmail}</TableHead>
              <TableHead>{t.table.servicesOffered}</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.loadError}
                </TableCell>
              </TableRow>
            ) : vendors?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite ? t.emptyWrite : t.empty}
                </TableCell>
              </TableRow>
            ) : (
              vendors?.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <span className="font-medium text-sm">
                      {vendor.companyName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {vendor.contactName ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{vendor.phone ?? '—'}</span>
                      {vendor.email && (
                        <span className="text-xs">{vendor.email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ServicesOfferedBadges
                      services={vendor.servicesOffered}
                      labels={t.serviceType}
                    />
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t.actionsLabel}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(vendor)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(vendor)}
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

      {/* ── Create Vendor Dialog ───────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.addTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <VendorFormFields
              idPrefix="v"
              register={regCreate}
              errors={createErrors}
              selectedServices={createServices}
              onToggleService={toggleCreateService}
              t={t.dialog}
              serviceTypeLabels={t.serviceType}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(EMPTY_VALUES);
                  setCreateServices([]);
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

      {/* ── Edit Vendor Dialog ─────────────────────────────────────────────── */}
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
            <VendorFormFields
              idPrefix="ve"
              register={regEdit}
              errors={editErrors}
              selectedServices={editServices}
              onToggleService={toggleEditService}
              t={t.dialog}
              serviceTypeLabels={t.serviceType}
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
            <DialogTitle>{t.dialog.deleteTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {(() => {
                const [before, after] = t.dialog.deleteConfirm.split('{name}');
                return (
                  <>
                    {before}
                    <span className="font-medium text-foreground">
                      {deleteTarget?.companyName}
                    </span>
                    {after}
                  </>
                );
              })()}
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
              {deleting ? t.dialog.deleting : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared form fields (create + edit dialogs) ────────────────────────────────

function VendorFormFields({
  idPrefix,
  register,
  errors,
  selectedServices,
  onToggleService,
  t,
  serviceTypeLabels,
}: {
  idPrefix: string;
  register: ReturnType<typeof useForm<VendorFormValues>>['register'];
  errors: ReturnType<typeof useForm<VendorFormValues>>['formState']['errors'];
  selectedServices: VendorServiceType[];
  onToggleService: (service: VendorServiceType) => void;
  t: Dictionary['vendors']['dialog'];
  serviceTypeLabels: Dictionary['vendors']['serviceType'];
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-companyName`}>
          {t.companyName} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-companyName`}
          placeholder={t.placeholderCompanyName}
          aria-invalid={!!errors.companyName}
          {...register('companyName')}
        />
        {errors.companyName && (
          <p className="text-xs text-destructive">
            {errors.companyName.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-contactName`}>
          {t.contactName}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-contactName`}
          placeholder={t.placeholderContactName}
          {...register('contactName')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-email`}>
          {t.email}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder={t.placeholderEmail}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>
          {t.phone}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-phone`}
          placeholder={t.placeholderPhone}
          {...register('phone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-address`}>
          {t.address}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-address`}
          placeholder={t.placeholderAddress}
          {...register('address')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>
          {t.servicesOffered}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <ServicesOfferedPicker
          selected={selectedServices}
          onToggle={onToggleService}
          labels={serviceTypeLabels}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          {t.notes}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder={t.placeholderNotes}
          rows={2}
          {...register('notes')}
        />
      </div>
    </>
  );
}
