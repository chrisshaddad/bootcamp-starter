'use client';

import { useState } from 'react';
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

const SERVICE_TYPE_LABELS: Record<VendorServiceType, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  cleaning: 'Cleaning',
  landscaping: 'Landscaping',
  hvac: 'HVAC',
  general_maintenance: 'General maintenance',
  other: 'Other',
};

function ServicesOfferedBadges({
  services,
}: {
  services: VendorServiceType[];
}) {
  if (services.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((service) => (
        <Badge key={service} variant="secondary" className="text-xs">
          {SERVICE_TYPE_LABELS[service] ?? service}
        </Badge>
      ))}
    </div>
  );
}

function ServicesOfferedPicker({
  selected,
  onToggle,
}: {
  selected: VendorServiceType[];
  onToggle: (service: VendorServiceType) => void;
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
            {SERVICE_TYPE_LABELS[service]}
          </button>
        );
      })}
    </div>
  );
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const vendorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

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
}

export function VendorsPage({ canWrite }: VendorsPageProps) {
  const { data: vendors, isLoading, isError } = useListVendorsQuery();
  const [createVendor, { isLoading: creating }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: updating }] = useUpdateVendorMutation();
  const [deleteVendor, { isLoading: deleting }] = useDeleteVendorMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [createServices, setCreateServices] = useState<VendorServiceType[]>([]);
  const [editTarget, setEditTarget] = useState<VendorResponse | null>(null);
  const [editServices, setEditServices] = useState<VendorServiceType[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<VendorResponse | null>(null);

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
      toast.success('Vendor created.');
      setCreateOpen(false);
      resetCreate(EMPTY_VALUES);
      setCreateServices([]);
    } catch {
      toast.error('Failed to create vendor. Please try again.');
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
      toast.success('Vendor updated.');
      setEditTarget(null);
    } catch {
      toast.error('Failed to update vendor.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteVendor(deleteTarget.id).unwrap();
      toast.success('Vendor deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete vendor.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? "Manage your organization's third-party service providers."
              : 'Third-party service providers for your organization.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              Read-only
            </Badge>
          )}
          {canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Add vendor
            </Button>
          )}
        </div>
      </div>

      {/* Vendors table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company name</TableHead>
              <TableHead>Contact name</TableHead>
              <TableHead>Phone / Email</TableHead>
              <TableHead>Services offered</TableHead>
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
                  Failed to load vendors. Please try again.
                </TableCell>
              </TableRow>
            ) : vendors?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite
                    ? 'No vendors yet. Add your first vendor.'
                    : 'No vendors yet.'}
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
                    <ServicesOfferedBadges services={vendor.servicesOffered} />
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Vendor actions"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(vendor)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(vendor)}
                          >
                            <TrashIcon className="size-3.5 mr-1.5" />
                            Delete
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
            <DialogTitle>Add vendor</DialogTitle>
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
                Cancel
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
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
            <DialogTitle>Edit vendor</DialogTitle>
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
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? 'Saving…' : 'Save'}
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
            <DialogTitle>Delete vendor</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.companyName}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
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
}: {
  idPrefix: string;
  register: ReturnType<typeof useForm<VendorFormValues>>['register'];
  errors: ReturnType<typeof useForm<VendorFormValues>>['formState']['errors'];
  selectedServices: VendorServiceType[];
  onToggleService: (service: VendorServiceType) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-companyName`}>
          Company name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-companyName`}
          placeholder="Acme Plumbing Co."
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
          Contact name{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-contactName`}
          placeholder="Jane Doe"
          {...register('contactName')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-email`}>
          Email{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="jane@acme.example"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>
          Phone{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-phone`}
          placeholder="+971 50 123 4567"
          {...register('phone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-address`}>
          Address{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-address`}
          placeholder="123 Main St"
          {...register('address')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>
          Services offered{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <ServicesOfferedPicker
          selected={selectedServices}
          onToggle={onToggleService}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          Notes{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder="Any notes…"
          rows={2}
          {...register('notes')}
        />
      </div>
    </>
  );
}
