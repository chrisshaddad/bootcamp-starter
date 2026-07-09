'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  Clock,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  isPharmacyScopedRole,
  userCreateRequestSchema,
  userRoleSchema,
  userStatusSchema,
  type UserCreateRequest,
  type UserUpdateRequest,
  type UserRole,
  type UserStatus,
  type UserListItem,
  type PharmacyOption,
} from '@repo/contracts';
import { useUsers, useUserActions } from '@/hooks/use-users';
import { usePharmacies } from '@/hooks/use-pharmacies';
import { usePlatformStats } from '@/hooks/use-platform-stats';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

// Shared entrance animation, matched to the dashboard: sections fade + rise in,
// staggered via an inline animationDelay so they arrive one after another
// instead of all at once.
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500';

function enterStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards' as const,
  };
}

// Every role is selectable — super admins are managed from this console too.
// The only user hidden from the list is the signed-in admin (done server-side).
const SELECTABLE_ROLES = userRoleSchema.options;

// Sort order: most privileged roles first, then alphabetical within a role.
const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 0,
  PHARMACY_ADMIN: 1,
  PHARMACY_MANAGER: 2,
  PHARMACY_EMPLOYEE: 3,
  STOCK_MANAGER: 4,
  INQUIRY_OFFICER: 5,
  CLIENT: 6,
};

// Turn an enum member like PHARMACY_ADMIN into "Pharmacy Admin".
function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Deterministic soft avatar tint so a given user keeps the same color.
const AVATAR_TINTS = [
  'bg-primary-100 text-primary-hover',
  'bg-secondary-200 text-warning-dark',
  'bg-success/15 text-success-dark',
  'bg-gray-200 text-gray-700',
];

function avatarTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + hash;
  return (
    AVATAR_TINTS[hash % AVATAR_TINTS.length] ?? 'bg-gray-200 text-gray-700'
  );
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
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {humanize(status)}
    </span>
  );
}

function formatDate(value: UserListItem['createdAt']): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface StatTile {
  key: UserStatus | 'TOTAL';
  label: string;
  icon: LucideIcon;
  iconClass: string;
}

const STAT_TILES: StatTile[] = [
  {
    key: 'TOTAL',
    label: 'Total users',
    icon: Users,
    iconClass: 'bg-primary-100 text-primary-hover',
  },
  {
    key: 'ACTIVE',
    label: 'Active',
    icon: UserCheck,
    iconClass: 'bg-success/10 text-success-dark',
  },
  {
    key: 'PENDING',
    label: 'Pending',
    icon: Clock,
    iconClass: 'bg-warning/15 text-warning-dark',
  },
  {
    key: 'SUSPENDED',
    label: 'Suspended',
    icon: Ban,
    iconClass: 'bg-error/10 text-error',
  },
];

// ---------------------------------------------------------------------------

function UserAvatar({
  user,
  size = 'default',
}: {
  user: UserListItem;
  size?: 'default' | 'lg';
}) {
  return (
    <Avatar size={size}>
      <AvatarFallback className={avatarTint(user.id)}>
        <User className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
      </AvatarFallback>
    </Avatar>
  );
}

// An inline editable cell: the trigger (a pill/label) opens a DropdownMenu of
// options. modal={false} keeps the page scrollable and avoids the scrollbar
// removal that a Radix Select would cause.
function RowEditMenu({
  trigger,
  ariaLabel,
  options,
  value,
  onChange,
  disabled,
}: {
  trigger: React.ReactNode;
  ariaLabel: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel}
          className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-200 disabled:pointer-events-none"
        >
          {trigger}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 w-52 overflow-y-auto"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
          >
            {option.label}
            {value === option.value ? (
              <Check className="ml-auto h-4 w-4" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserRow({
  user,
  pharmacies,
  pharmaciesLoading,
  onView,
  onDelete,
}: {
  user: UserListItem;
  pharmacies: PharmacyOption[] | undefined;
  pharmaciesLoading: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  const { updateUser } = useUserActions();
  const name = `${user.firstName} ${user.lastName}`;
  const pharmacyRole = isPharmacyScopedRole(user.role);

  async function patch(data: UserUpdateRequest, message: string) {
    try {
      await updateUser(user.id, data);
      toast.success(message);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update user.',
      );
    }
  }

  // Interactive cells stop the click from bubbling to the row's view handler.
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <TableRow
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onView();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View profile for ${name}`}
      className="cursor-pointer"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{name}</p>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell onClick={stop}>
        {/* Inline role editing is only for reshuffling pharmacy staff among
            pharmacy-scoped roles. Crossing the pharmacy boundary — to/from
            CLIENT or SUPER_ADMIN — is a deliberate, higher-stakes change (and
            gaining a pharmacy role needs a pharmacy assigned first), so it is
            not offered here. Non-pharmacy users show a static pill. */}
        {pharmacyRole ? (
          <RowEditMenu
            ariaLabel={`Change role for ${name}`}
            trigger={<RolePill role={user.role} />}
            value={user.role}
            options={SELECTABLE_ROLES.filter(isPharmacyScopedRole).map(
              (role) => ({
                value: role,
                label: humanize(role),
              }),
            )}
            onChange={(value) =>
              void patch(
                { role: value as UserRole },
                `Role updated for ${name}.`,
              )
            }
          />
        ) : (
          <RolePill role={user.role} />
        )}
      </TableCell>
      <TableCell onClick={stop}>
        <RowEditMenu
          ariaLabel={`Change status for ${name}`}
          trigger={<StatusPill status={user.status} />}
          value={user.status}
          options={userStatusSchema.options.map((status) => ({
            value: status,
            label: humanize(status),
          }))}
          onChange={(value) =>
            void patch(
              { status: value as UserStatus },
              `Status updated for ${name}.`,
            )
          }
        />
      </TableCell>
      <TableCell onClick={stop}>
        {pharmacyRole ? (
          <RowEditMenu
            ariaLabel={`Change pharmacy for ${name}`}
            trigger={
              <span
                title={user.pharmacyName ?? undefined}
                className={`block max-w-36 truncate ${
                  user.pharmacyName ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {user.pharmacyName ?? 'Select pharmacy'}
              </span>
            }
            value={user.pharmacyId}
            options={(pharmacies ?? []).map((pharmacy) => ({
              value: pharmacy.id,
              label: pharmacy.name,
            }))}
            onChange={(value) =>
              void patch({ pharmacyId: value }, `Pharmacy updated for ${name}.`)
            }
            disabled={pharmaciesLoading}
          />
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="text-gray-600">
        {formatDate(user.createdAt)}
      </TableCell>
      <TableCell onClick={stop} className="text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          title="Delete user"
          aria-label={`Delete ${name}`}
          className="text-error hover:bg-error/10 hover:text-error-dark"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2.5 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{children}</span>
    </div>
  );
}

function ViewProfileDialog({
  user,
  onClose,
}: {
  user: UserListItem;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User profile</DialogTitle>
          <DialogDescription>
            Read-only overview of this platform user.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="px-1">
          <DetailRow label="Role">
            <RolePill role={user.role} />
          </DetailRow>
          <DetailRow label="Status">
            <StatusPill status={user.status} />
          </DetailRow>
          <DetailRow label="Pharmacy">
            {user.pharmacyName ?? <span className="text-gray-400">—</span>}
          </DetailRow>
          <DetailRow label="Joined">{formatDate(user.createdAt)}</DetailRow>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PharmacySelect({
  value,
  onChange,
  pharmacies,
  loading,
  fetchFailed,
  error,
}: {
  value: string | null;
  onChange: (value: string) => void;
  pharmacies: PharmacyOption[] | undefined;
  loading: boolean;
  fetchFailed?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">Pharmacy</label>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={loading ? 'Loading pharmacies…' : 'Select a pharmacy'}
          />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="px-2 py-1.5 text-sm text-gray-500">Loading…</div>
          ) : fetchFailed ? (
            <div className="px-2 py-1.5 text-sm text-error">
              Couldn’t load pharmacies. Please try again.
            </div>
          ) : pharmacies && pharmacies.length > 0 ? (
            pharmacies.map((pharmacy) => (
              <SelectItem key={pharmacy.id} value={pharmacy.id}>
                {pharmacy.name}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-gray-500">
              No pharmacies found
            </div>
          )}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const { createUser } = useUserActions();
  const {
    pharmacies,
    isLoading: pharmaciesLoading,
    error: pharmaciesError,
  } = usePharmacies();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateRequest>({
    resolver: zodResolver(userCreateRequestSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'CLIENT',
      status: 'ACTIVE',
      pharmacyId: null,
    },
  });
  const selectedRole = watch('role');

  const onSubmit = async (data: UserCreateRequest) => {
    try {
      await createUser(data);
      toast.success(`Created ${data.firstName} ${data.lastName}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to create user.',
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>
              Create a platform user. They set a password on first sign-in via
              the magic link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  First name
                </label>
                <Input {...register('firstName')} placeholder="Jane" />
                {errors.firstName ? (
                  <p className="text-xs text-error">
                    {errors.firstName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Last name
                </label>
                <Input {...register('lastName')} placeholder="Doe" />
                {errors.lastName ? (
                  <p className="text-xs text-error">
                    {errors.lastName.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                {...register('email')}
                placeholder="jane@example.com"
              />
              {errors.email ? (
                <p className="text-xs text-error">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Role
                </label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (!isPharmacyScopedRole(value as UserRole)) {
                          setValue('pharmacyId', null, {
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SELECTABLE_ROLES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {humanize(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userStatusSchema.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {humanize(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {isPharmacyScopedRole(selectedRole) ? (
              <Controller
                control={control}
                name="pharmacyId"
                render={({ field }) => (
                  <PharmacySelect
                    value={field.value ?? null}
                    onChange={field.onChange}
                    pharmacies={pharmacies}
                    loading={pharmaciesLoading}
                    fetchFailed={Boolean(pharmaciesError)}
                    error={errors.pharmacyId?.message}
                  />
                )}
              />
            ) : null}
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
              {isSubmitting ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({
  user,
  onClose,
}: {
  user: UserListItem;
  onClose: () => void;
}) {
  const { deleteUser } = useUserActions();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteUser(user.id);
      toast.success(`Deleted ${user.firstName} ${user.lastName}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete user.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            This permanently deletes {user.firstName} {user.lastName} (
            {user.email}). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

// A filter dropdown built on DropdownMenu with modal={false} so it does NOT
// lock page scroll — that scroll-lock is what removed the scrollbar and flashed
// a white strip on the right when the old Radix Select opened.
function FilterMenu<T extends string>({
  allLabel,
  value,
  options,
  onChange,
  width,
  labelFor,
}: {
  allLabel: string;
  value: T | undefined;
  options: readonly T[];
  onChange: (value: T | undefined) => void;
  width: string;
  // How to render an option's label; defaults to humanizing the enum value.
  labelFor?: (value: T) => string;
}) {
  const label = (option: T) => (labelFor ? labelFor(option) : humanize(option));

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`h-9 justify-between font-normal ${width}`}
        >
          <span
            className={`truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}
          >
            {value ? label(value) : allLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`max-h-72 overflow-y-auto ${width}`}
      >
        <DropdownMenuItem onSelect={() => onChange(undefined)}>
          {allLabel}
          {value === undefined ? <Check className="ml-auto h-4 w-4" /> : null}
        </DropdownMenuItem>
        {options.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => onChange(option)}>
            <span className="truncate">{label(option)}</span>
            {value === option ? <Check className="ml-auto h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// A searchable single-select filter. Adds a search box so long option lists
// (e.g. a growing pharmacy list) stay navigable — Radix's DropdownMenu doesn't
// filter in-menu well, so plain FilterMenu doesn't scale for these.
function FilterCombobox({
  allLabel,
  value,
  options,
  onChange,
  width,
  labelFor,
}: {
  allLabel: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string | undefined) => void;
  width: string;
  labelFor?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const render = (raw: string) => (labelFor ? labelFor(raw) : raw);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open]);

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((option) => render(option).toLowerCase().includes(needle))
    : options;
  // Cap the rendered list so a large catalog never bogs the popup down; the
  // search box narrows the rest.
  const shown = filtered.slice(0, 50);
  const hidden = filtered.length - shown.length;

  const choose = (next: string | undefined) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} className={cn('relative', width)}>
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full justify-between font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={cn('truncate', value ? 'text-gray-900' : 'text-gray-500')}
        >
          {value ? render(value) : allLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </Button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
              }}
              placeholder="Search…"
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => choose(undefined)}
            >
              {allLabel}
              {value === undefined ? (
                <Check className="h-4 w-4 shrink-0 text-gray-400" />
              ) : null}
            </button>
            {shown.map((option) => (
              <button
                key={option}
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => choose(option)}
              >
                <span className="truncate">{render(option)}</span>
                {value === option ? (
                  <Check className="h-4 w-4 shrink-0 text-gray-400" />
                ) : null}
              </button>
            ))}
            {shown.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
            ) : null}
            {hidden > 0 ? (
              <p className="px-3 py-1.5 text-xs text-gray-400">
                +{hidden} more — refine your search
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function UsersPage() {
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const [pharmacyId, setPharmacyId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{
    mode: 'view' | 'delete';
    user: UserListItem;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // The summary tiles reflect the whole platform — real, unscoped totals from
  // `/stats/platform` (which, unlike the user list below, counts the signed-in
  // admin too). The filtered list drives the table.
  const { users, isLoading, error, mutate } = useUsers({ role, status });
  const { pharmacies, isLoading: pharmaciesLoading } = usePharmacies();
  const { stats: platformStats, isLoading: statsLoading } = usePlatformStats();

  const stats: Record<string, number> = {
    TOTAL: platformStats?.users.total ?? 0,
    ACTIVE: platformStats?.users.active ?? 0,
    PENDING: platformStats?.users.pending ?? 0,
    SUSPENDED: platformStats?.users.suspended ?? 0,
  };

  // Filter by search, then sort by role rank → name. Sorting on stable fields
  // (role, name, id) keeps every row in place when its status is toggled.
  const rows = useMemo(() => {
    if (!users) return users;
    const query = search.trim().toLowerCase();
    const matched = users.filter((user) => {
      if (pharmacyId && user.pharmacyId !== pharmacyId) return false;
      if (
        query &&
        !`${user.firstName} ${user.lastName}`.toLowerCase().includes(query) &&
        !user.email.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
    return [...matched].sort(
      (a, b) =>
        ROLE_RANK[a.role] - ROLE_RANK[b.role] ||
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName) ||
        a.id.localeCompare(b.id),
    );
  }, [users, search, pharmacyId]);

  return (
    <div className="space-y-6">
      <div
        className={`flex items-start justify-between gap-4 ${ENTER}`}
        style={enterStyle(0)}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage platform users by role, status, and pharmacy
            access.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-12 w-40 shrink-0 justify-center px-6 text-base"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-5 w-5" />
          New user
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_TILES.map((tile, index) => (
          <Card
            key={tile.key}
            className={`py-0 ${ENTER}`}
            style={enterStyle(70 + index * 70)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.iconClass}`}
              >
                <tile.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-500">{tile.label}</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-6 w-8" />
                ) : (
                  <p className="text-xl font-semibold text-gray-900">
                    {stats[tile.key] ?? 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${ENTER}`}
        style={enterStyle(360)}
      >
        <div className="relative w-full sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users by name or email…"
            className="h-9 w-full pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterMenu
            allLabel="All roles"
            value={role}
            options={SELECTABLE_ROLES}
            onChange={setRole}
            width="w-44"
          />
          <FilterMenu
            allLabel="All statuses"
            value={status}
            options={userStatusSchema.options}
            onChange={setStatus}
            width="w-44"
          />
          <FilterCombobox
            allLabel="All pharmacies"
            value={pharmacyId}
            options={(pharmacies ?? []).map((pharmacy) => pharmacy.id)}
            onChange={setPharmacyId}
            width="w-44"
            labelFor={(id) =>
              pharmacies?.find((pharmacy) => pharmacy.id === id)?.name ??
              'Unknown pharmacy'
            }
          />
        </div>
      </div>

      {/* Table */}
      <Card
        className={`gap-0 overflow-hidden py-0 ${ENTER}`}
        style={enterStyle(420)}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load users
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching the user list. Please try
              again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 flex-1" />
              </div>
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No users found
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              No users match the current search and filters.
            </p>
          </div>
        ) : (
          <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead className="w-40">Role</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-52">Pharmacy</TableHead>
                <TableHead className="w-28">Joined</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  pharmacies={pharmacies}
                  pharmaciesLoading={pharmaciesLoading}
                  onView={() => setDialog({ mode: 'view', user })}
                  onDelete={() => setDialog({ mode: 'delete', user })}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {dialog?.mode === 'view' ? (
        <ViewProfileDialog
          key={dialog.user.id}
          user={dialog.user}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === 'delete' ? (
        <DeleteUserDialog
          key={dialog.user.id}
          user={dialog.user}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {createOpen ? (
        <CreateUserDialog onClose={() => setCreateOpen(false)} />
      ) : null}
    </div>
  );
}
