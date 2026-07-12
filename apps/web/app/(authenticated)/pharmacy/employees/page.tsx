'use client';

import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Plus,
  Search,
  Users,
  UserCheck,
  Clock,
  Ban,
} from 'lucide-react';
import {
  employeeInviteRequestSchema,
  employeeRoleSchema,
  type EmployeeInviteRequest,
  type EmployeeResponse,
  type EmployeeRole,
  type UserStatus,
} from '@repo/contracts';
import {
  useEmployees,
  useEmployeeBranchOptions,
  useEmployeeActions,
} from '@/hooks/use-employees';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { ENTER, enterStyle } from '@/lib/enter-animation';

// ---------------------------------------------------------------------------
// Helpers + presentational bits (kept inline, mirroring the users console).
// ---------------------------------------------------------------------------

// PHARMACY_MANAGER → "Pharmacy Manager"
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

const EMPLOYEE_ROLES = employeeRoleSchema.options;

// Statuses an admin may set on staff. PENDING is only ever set by the invite
// flow itself, so it isn't offered as a manual choice.
const ASSIGNABLE_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const ROLE_STYLES: Record<EmployeeRole, string> = {
  PHARMACY_MANAGER: 'bg-secondary-100 text-warning-dark',
  PHARMACY_EMPLOYEE: 'bg-gray-100 text-gray-600',
  STOCK_MANAGER: 'bg-success/10 text-success-dark',
  INQUIRY_OFFICER: 'bg-warning/10 text-warning-dark',
};

function RolePill({ role }: { role: EmployeeRole }) {
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

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// Generic single-select filter dropdown. modal={false} avoids Radix's scroll
// lock, which otherwise flashes a strip on the right when opening.
function FilterMenu<T extends string>({
  allLabel,
  value,
  options,
  onChange,
  width = 'w-44',
  labelFor,
}: {
  allLabel: string;
  value: T | undefined;
  options: readonly T[];
  onChange: (value: T | undefined) => void;
  width?: string;
  labelFor?: (option: T) => string;
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

// Inline editable cell: the pill is the trigger; picking an option fires onChange.
function RowEditMenu<T extends string>({
  trigger,
  ariaLabel,
  options,
  value,
  onChange,
}: {
  trigger: React.ReactNode;
  ariaLabel: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-200"
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
            <span className="truncate">{option.label}</span>
            {value === option.value ? (
              <Check className="ml-auto h-4 w-4" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function EmployeeRow({
  employee,
  branches,
}: {
  employee: EmployeeResponse;
  branches: { id: string; name: string }[] | undefined;
}) {
  const { updateEmployee } = useEmployeeActions();
  const name = `${employee.firstName} ${employee.lastName}`;

  async function patch(
    data: Parameters<typeof updateEmployee>[1],
    message: string,
  ) {
    try {
      await updateEmployee(employee.id, data);
      toast.success(message);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to update employee.',
      );
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-hover">
            {initials(employee.firstName, employee.lastName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{name}</p>
            <p className="truncate text-sm text-gray-500">{employee.email}</p>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <RowEditMenu
          ariaLabel={`Change role for ${name}`}
          trigger={<RolePill role={employee.role} />}
          value={employee.role}
          options={EMPLOYEE_ROLES.map((role) => ({
            value: role,
            label: humanize(role),
          }))}
          onChange={(role) => void patch({ role }, `Role updated for ${name}.`)}
        />
      </TableCell>

      <TableCell>
        <RowEditMenu
          ariaLabel={`Change status for ${name}`}
          trigger={<StatusPill status={employee.status} />}
          value={employee.status}
          options={ASSIGNABLE_STATUSES.map((status) => ({
            value: status,
            label: humanize(status),
          }))}
          onChange={(status) =>
            void patch({ status }, `Status updated for ${name}.`)
          }
        />
      </TableCell>

      <TableCell>
        {branches && branches.length > 0 ? (
          <RowEditMenu
            ariaLabel={`Reassign branch for ${name}`}
            trigger={
              <span className="text-sm text-gray-700">
                {employee.branchName ?? 'Unassigned'}
              </span>
            }
            value={employee.branchId}
            options={branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
            onChange={(branchId) =>
              void patch({ branchId }, `Branch updated for ${name}.`)
            }
          />
        ) : (
          <span className="text-sm text-gray-500">
            {employee.branchName ?? 'Unassigned'}
          </span>
        )}
      </TableCell>

      <TableCell className="text-gray-500">
        {formatDate(employee.createdAt)}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

function InviteEmployeeDialog({ onClose }: { onClose: () => void }) {
  const { inviteEmployee } = useEmployeeActions();
  const { branches, isLoading: branchesLoading } = useEmployeeBranchOptions();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeInviteRequest>({
    resolver: zodResolver(employeeInviteRequestSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'PHARMACY_EMPLOYEE',
      branchId: '',
    },
  });

  const noBranches = !branchesLoading && (!branches || branches.length === 0);

  const onSubmit = async (data: EmployeeInviteRequest) => {
    try {
      await inviteEmployee(data);
      toast.success(`Invite sent to ${data.email}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to invite employee.',
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Invite employee</DialogTitle>
            <DialogDescription>
              We&apos;ll email them a magic link to set a password and join your
              pharmacy.
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {humanize(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Branch
                </label>
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={branchesLoading || noBranches}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {(branches ?? []).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.branchId ? (
                  <p className="text-xs text-error">
                    {errors.branchId.message}
                  </p>
                ) : null}
              </div>
            </div>

            {noBranches ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-dark">
                Create a branch first — every employee belongs to one.
              </p>
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
            <Button type="submit" disabled={isSubmitting || noBranches}>
              {isSubmitting ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STAT_TILES = [
  {
    key: 'TOTAL',
    label: 'Total staff',
    icon: Users,
    iconClass: 'bg-primary-100 text-primary-hover',
  },
  {
    key: 'ACTIVE',
    label: 'Active',
    icon: UserCheck,
    iconClass: 'bg-success/10 text-success',
  },
  {
    key: 'PENDING',
    label: 'Pending invites',
    icon: Clock,
    iconClass: 'bg-warning/15 text-warning-dark',
  },
  {
    key: 'SUSPENDED',
    label: 'Suspended',
    icon: Ban,
    iconClass: 'bg-error/10 text-error',
  },
] as const;

export default function EmployeesPage() {
  const [role, setRole] = useState<EmployeeRole | undefined>(undefined);
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  // One unfiltered fetch; role/status/branch/search are applied client-side so
  // the summary tiles stay stable as filters change. A pharmacy's staff list is
  // small, so this is cheaper than re-fetching per filter.
  const { employees, isLoading, error, mutate } = useEmployees();
  const { branches } = useEmployeeBranchOptions();

  const stats: Record<string, number> = useMemo(() => {
    const list = employees ?? [];
    return {
      TOTAL: list.length,
      ACTIVE: list.filter((e) => e.status === 'ACTIVE').length,
      PENDING: list.filter((e) => e.status === 'PENDING').length,
      SUSPENDED: list.filter((e) => e.status === 'SUSPENDED').length,
    };
  }, [employees]);

  const rows = useMemo(() => {
    if (!employees) return employees;
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (role && employee.role !== role) return false;
      if (status && employee.status !== status) return false;
      if (branchId && employee.branchId !== branchId) return false;
      if (
        query &&
        !`${employee.firstName} ${employee.lastName}`
          .toLowerCase()
          .includes(query) &&
        !employee.email.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [employees, role, status, branchId, search]);

  return (
    <div className="space-y-6">
      <div
        className={`flex items-start justify-between gap-4 ${ENTER}`}
        style={enterStyle(0)}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite staff and manage their role, branch, and access across your
            pharmacy.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-12 w-44 shrink-0 justify-center px-6 text-base"
          onClick={() => setInviteOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Invite employee
        </Button>
      </div>

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
                {isLoading ? (
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

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${ENTER}`}
        style={enterStyle(360)}
      >
        <div className="relative w-full sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff by name or email…"
            className="h-9 w-full pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterMenu
            allLabel="All roles"
            value={role}
            options={EMPLOYEE_ROLES}
            onChange={setRole}
          />
          <FilterMenu
            allLabel="All statuses"
            value={status}
            options={['ACTIVE', 'PENDING', 'INACTIVE', 'SUSPENDED'] as const}
            onChange={setStatus}
          />
          <FilterMenu
            allLabel="All branches"
            value={branchId}
            options={(branches ?? []).map((branch) => branch.id)}
            onChange={setBranchId}
            labelFor={(id) =>
              branches?.find((branch) => branch.id === id)?.name ?? 'Unknown'
            }
          />
        </div>
      </div>

      <Card
        className={`gap-0 overflow-hidden py-0 ${ENTER}`}
        style={enterStyle(420)}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load employees
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching your staff list. Please try
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
              No employees found
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              {employees && employees.length > 0
                ? 'No staff match the current search and filters.'
                : 'Invite your first employee to get started.'}
            </p>
          </div>
        ) : (
          <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Employee</TableHead>
                <TableHead className="w-44">Role</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-44">Branch</TableHead>
                <TableHead className="w-28">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  branches={branches}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {inviteOpen ? (
        <InviteEmployeeDialog onClose={() => setInviteOpen(false)} />
      ) : null}
    </div>
  );
}
