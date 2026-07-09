'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  GitBranch,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { branchCreateRequestSchema } from '@repo/contracts';
import type {
  BranchCreateRequest,
  BranchResponse,
  PharmacyDetailResponse,
  PharmacyUserSummary,
  UserRole,
  UserStatus,
} from '@repo/contracts';
import { usePharmacyDetail, usePharmacyActions } from '@/hooks/use-pharmacies';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BranchFields, type BranchFieldKey } from '../branch-fields';

// Shared entrance animation, matched to the dashboard.
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500';

function enterStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards' as const,
  };
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const ROLE_STYLES: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-primary-100 text-primary-hover',
  PHARMACY_ADMIN: 'bg-primary-100 text-primary-hover',
  PHARMACY_MANAGER: 'bg-secondary-100 text-warning-dark',
  PHARMACY_EMPLOYEE: 'bg-gray-100 text-gray-600',
  STOCK_MANAGER: 'bg-success/10 text-success-dark',
  INQUIRY_OFFICER: 'bg-warning/10 text-warning-dark',
  CLIENT: 'bg-gray-100 text-gray-600',
};

function RolePill({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        ROLE_STYLES[role],
      )}
    >
      {humanize(role)}
    </span>
  );
}

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'bg-success/10 text-success',
  PENDING: 'bg-warning/15 text-warning-dark',
  SUSPENDED: 'bg-error/10 text-error',
  INACTIVE: 'bg-gray-200 text-gray-600',
};

function StatusPill({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {humanize(status)}
    </span>
  );
}

// Colored "at a glance" tiles, same palette family as the dashboard.
const STAT_STYLES = [
  {
    bg: '#EAF3DE',
    border: '#C0DD97',
    label: '#3B6D11',
    number: '#173404',
    icon: '#27500A',
  },
  {
    bg: '#FAEEDA',
    border: '#FAC775',
    label: '#854F0B',
    number: '#412402',
    icon: '#633806',
  },
  {
    bg: '#EEEDFE',
    border: '#CECBF6',
    label: '#3C3489',
    number: '#26215C',
    icon: '#3C3489',
  },
] as const;

// ---------------------------------------------------------------------------
// Branch add / edit dialog

// The branch identity rules (name, address) come straight from the API contract
// via `.pick()` so they can't drift from the server. The form only adds the
// concerns the contract doesn't model for a text form: a plain phone field
// (mapped to phoneNumber on submit) and coordinate *string* inputs that must
// reject an empty value — the contract coerces numbers, where '' would become a
// valid 0 and slip through. The submit handler maps these back to
// BranchCreateRequest (phone → phoneNumber, strings → numbers).
const branchFormSchema = branchCreateRequestSchema
  .pick({ name: true, address: true })
  .extend({
    phone: z.string().trim().max(20),
    latitude: z
      .string()
      .trim()
      .refine((value) => {
        const parsed = Number(value);
        return (
          value !== '' && !Number.isNaN(parsed) && parsed >= -90 && parsed <= 90
        );
      }, 'Latitude must be between -90 and 90'),
    longitude: z
      .string()
      .trim()
      .refine((value) => {
        const parsed = Number(value);
        return (
          value !== '' &&
          !Number.isNaN(parsed) &&
          parsed >= -180 &&
          parsed <= 180
        );
      }, 'Longitude must be between -180 and 180'),
  });

type BranchFormValues = z.infer<typeof branchFormSchema>;

function toBranchFormValues(branch?: BranchResponse | null): BranchFormValues {
  return {
    name: branch?.name ?? '',
    phone: branch?.phoneNumber ?? '',
    address: branch?.address ?? '',
    latitude: branch ? String(branch.latitude) : '',
    longitude: branch ? String(branch.longitude) : '',
  };
}

function BranchFormDialog({
  pharmacyId,
  branch,
  onClose,
}: {
  pharmacyId: string;
  branch?: BranchResponse | null;
  onClose: () => void;
}) {
  const { addBranch, updateBranch } = usePharmacyActions();
  const isEdit = Boolean(branch);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: toBranchFormValues(branch),
  });

  const onSubmit = async (data: BranchFormValues) => {
    const payload: BranchCreateRequest = {
      name: data.name,
      phoneNumber: data.phone || null,
      address: data.address,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    };
    try {
      if (branch) {
        await updateBranch(pharmacyId, branch.id, payload);
        toast.success(`Updated ${payload.name}.`);
      } else {
        await addBranch(pharmacyId, payload);
        toast.success(`Added ${payload.name}.`);
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to save branch.',
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit branch' : 'New branch'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update this branch’s details and location.'
                : 'Add a branch to this pharmacy with its address and location.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <BranchFields
              register={(field: BranchFieldKey) => register(field)}
              errors={{
                name: errors.name?.message,
                phone: errors.phone?.message,
                address: errors.address?.message,
                latitude: errors.latitude?.message,
                longitude: errors.longitude?.message,
              }}
            />
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Add branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBranchDialog({
  pharmacyId,
  branch,
  onClose,
}: {
  pharmacyId: string;
  branch: BranchResponse;
  onClose: () => void;
}) {
  const { deleteBranch } = usePharmacyActions();
  const [deleting, setDeleting] = useState(false);
  const blocked = branch.userCount > 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBranch(pharmacyId, branch.id);
      toast.success(`Deleted ${branch.name}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete branch.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete branch</DialogTitle>
          <DialogDescription>
            {blocked ? (
              <>
                {branch.name} still has {branch.userCount}{' '}
                {branch.userCount === 1 ? 'user' : 'users'} assigned. Reassign
                them to another branch before deleting it.
              </>
            ) : (
              <>
                This permanently deletes {branch.name}. This action cannot be
                undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
          >
            {blocked ? 'Close' : 'Cancel'}
          </Button>
          {!blocked ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete branch'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePharmacyDialog({
  pharmacy,
  onClose,
}: {
  pharmacy: PharmacyDetailResponse;
  onClose: () => void;
}) {
  const router = useRouter();
  const { deletePharmacy } = usePharmacyActions();
  const [deleting, setDeleting] = useState(false);
  const blocked = pharmacy.userCount > 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePharmacy(pharmacy.id);
      toast.success(`Deleted ${pharmacy.name}.`);
      router.push('/admin/pharmacies');
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to delete pharmacy.',
      );
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete pharmacy</DialogTitle>
          <DialogDescription>
            {blocked ? (
              <>
                {pharmacy.name} still has {pharmacy.userCount}{' '}
                {pharmacy.userCount === 1 ? 'user' : 'users'} (including its
                admin). Remove or reassign them before the pharmacy can be
                deleted.
              </>
            ) : (
              <>
                This permanently deletes {pharmacy.name} and cascades to its{' '}
                {pharmacy.branchCount}{' '}
                {pharmacy.branchCount === 1 ? 'branch' : 'branches'}, along with
                any inquiries and stock. This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
          >
            {blocked ? 'Close' : 'Cancel'}
          </Button>
          {!blocked ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete pharmacy'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

function BranchCard({
  branch,
  onEdit,
  onDelete,
}: {
  branch: BranchResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
          <GitBranch className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-gray-900">{branch.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{branch.address}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {branch.phoneNumber ? (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {branch.phoneNumber}
              </span>
            ) : null}
            <span className="font-mono">
              {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {branch.userCount} {branch.userCount === 1 ? 'user' : 'users'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          title="Edit branch"
          aria-label={`Edit ${branch.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          title="Delete branch"
          aria-label={`Delete ${branch.name}`}
          className="text-error hover:bg-error/10 hover:text-error-dark"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UserAvatarCell({ user }: { user: PharmacyUserSummary }) {
  const name = `${user.firstName} ${user.lastName}`;
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900">{name}</p>
        <p className="truncate text-sm text-gray-500">{user.email}</p>
      </div>
    </div>
  );
}

// Inline branch assignment for a user in the pharmacy. Lists this pharmacy's
// branches plus an "Unassigned" option; picking one PATCHes the user's branch.
function BranchAssignCell({
  pharmacyId,
  user,
  branches,
}: {
  pharmacyId: string;
  user: PharmacyUserSummary;
  branches: BranchResponse[];
}) {
  const { assignUserBranch } = usePharmacyActions();
  const [saving, setSaving] = useState(false);

  async function assign(branchId: string | null) {
    if (branchId === user.branchId) return;
    setSaving(true);
    try {
      await assignUserBranch(pharmacyId, user.id, branchId);
      const branchName = branches.find((b) => b.id === branchId)?.name;
      toast.success(
        branchName
          ? `Assigned ${user.firstName} to ${branchName}.`
          : `Unassigned ${user.firstName} from their branch.`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update branch.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={saving}>
        <button
          type="button"
          aria-label={`Change branch for ${user.firstName} ${user.lastName}`}
          className="-mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-200 disabled:pointer-events-none"
        >
          <span
            className={cn(
              'truncate',
              user.branchName ? 'text-gray-700' : 'text-gray-400',
            )}
          >
            {user.branchName ?? 'Unassigned'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 w-52 overflow-y-auto"
      >
        <DropdownMenuItem onSelect={() => void assign(null)}>
          Unassigned
          {user.branchId === null ? (
            <Check className="ml-auto h-4 w-4" />
          ) : null}
        </DropdownMenuItem>
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onSelect={() => void assign(branch.id)}
          >
            <span className="truncate">{branch.name}</span>
            {user.branchId === branch.id ? (
              <Check className="ml-auto h-4 w-4" />
            ) : null}
          </DropdownMenuItem>
        ))}
        {branches.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-gray-400">
            No branches yet — add one first.
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DialogState =
  | { mode: 'add-branch' }
  | { mode: 'edit-branch'; branch: BranchResponse }
  | { mode: 'delete-branch'; branch: BranchResponse }
  | { mode: 'delete-pharmacy' }
  | null;

export default function PharmacyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { pharmacy, isLoading, error, mutate } = usePharmacyDetail(id);
  const [dialog, setDialog] = useState<DialogState>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Card className="py-0">
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load this pharmacy
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              It may have been deleted, or something went wrong. Please try
              again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const statTiles: {
    label: string;
    value: number;
    icon: LucideIcon;
  }[] = [
    { label: 'Branches', value: pharmacy.branchCount, icon: GitBranch },
    { label: 'Admins', value: pharmacy.adminCount, icon: ShieldCheck },
    { label: 'Total users', value: pharmacy.userCount, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className={ENTER} style={enterStyle(0)}>
        <BackLink />
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-hover">
              <Store className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-gray-900">
                {pharmacy.name}
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Registered {formatDate(pharmacy.createdAt)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 text-error hover:bg-error/10 hover:text-error-dark"
            onClick={() => setDialog({ mode: 'delete-pharmacy' })}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Overview stat row */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-stretch gap-3">
        {statTiles.map((stat, index) => {
          const Icon = stat.icon;
          const s = STAT_STYLES[index] ?? STAT_STYLES[0];
          return (
            <Card
              key={stat.label}
              className={`rounded-2xl border py-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${ENTER}`}
              style={{
                backgroundColor: s.bg,
                borderColor: s.border,
                borderWidth: '0.5px',
                ...enterStyle(70 + index * 70),
              }}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: s.label }}
                  >
                    {stat.label}
                  </p>
                  <p
                    className="mt-2 text-[28px] font-medium tracking-tight tabular-nums"
                    style={{ color: s.number }}
                  >
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.67)' }}
                >
                  <Icon className="h-5 w-5" style={{ color: s.icon }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Branches + Users tabs */}
      <div className={ENTER} style={enterStyle(300)}>
        <Tabs defaultValue="branches" className="gap-4">
          <TabsList>
            <TabsTrigger value="branches">
              Branches ({pharmacy.branchCount})
            </TabsTrigger>
            <TabsTrigger value="users">
              Users ({pharmacy.userCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setDialog({ mode: 'add-branch' })}
              >
                <Plus className="h-4 w-4" />
                Add branch
              </Button>
            </div>
            {pharmacy.branches.length > 0 ? (
              <div className="space-y-3">
                {pharmacy.branches.map((branch) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    onEdit={() => setDialog({ mode: 'edit-branch', branch })}
                    onDelete={() =>
                      setDialog({ mode: 'delete-branch', branch })
                    }
                  />
                ))}
              </div>
            ) : (
              <Card className="py-0">
                <div className="flex flex-col items-center justify-center py-16">
                  <GitBranch className="mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">
                    No branches yet
                  </h3>
                  <p className="mb-4 max-w-md text-center text-sm text-gray-500">
                    This pharmacy doesn’t have any branches. Add its first one.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setDialog({ mode: 'add-branch' })}
                  >
                    <Plus className="h-4 w-4" />
                    Add branch
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card className="gap-0 overflow-hidden py-0">
              {pharmacy.users.length > 0 ? (
                <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>User</TableHead>
                      <TableHead className="w-44">Role</TableHead>
                      <TableHead className="w-36">Status</TableHead>
                      <TableHead className="w-40">Branch</TableHead>
                      <TableHead className="w-28">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pharmacy.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <UserAvatarCell user={user} />
                        </TableCell>
                        <TableCell>
                          <RolePill role={user.role} />
                        </TableCell>
                        <TableCell>
                          <StatusPill status={user.status} />
                        </TableCell>
                        <TableCell>
                          <BranchAssignCell
                            pharmacyId={pharmacy.id}
                            user={user}
                            branches={pharmacy.branches}
                          />
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(user.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <Users className="mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">
                    No users
                  </h3>
                  <p className="max-w-md text-center text-sm text-gray-500">
                    No users are linked to this pharmacy yet.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {dialog?.mode === 'add-branch' ? (
        <BranchFormDialog
          pharmacyId={pharmacy.id}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === 'edit-branch' ? (
        <BranchFormDialog
          key={dialog.branch.id}
          pharmacyId={pharmacy.id}
          branch={dialog.branch}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === 'delete-branch' ? (
        <DeleteBranchDialog
          key={dialog.branch.id}
          pharmacyId={pharmacy.id}
          branch={dialog.branch}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === 'delete-pharmacy' ? (
        <DeletePharmacyDialog
          pharmacy={pharmacy}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/pharmacies"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary-base"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to pharmacies
    </Link>
  );
}
