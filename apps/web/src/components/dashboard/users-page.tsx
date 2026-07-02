'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  PlusIcon,
  MoreHorizontalIcon,
  UserIcon,
  Building2Icon,
  EyeIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useListUsersQuery,
  useCreateUserMutation,
  usePatchUserMutation,
  useDeleteUserMutation,
} from '@/store/api/endpoints/users.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import type { MemberResponse, MemberRole, AssignableRole } from '@/types/api';

// ── Role display helpers ─────────────────────────────────────────────────────

const ROLE_LABELS: Record<MemberRole, string> = {
  org_admin: 'Admin',
  supervisor: 'Supervisor',
  finance: 'Finance',
  maintenance: 'Maintenance',
  tenant: 'Tenant',
};

const ROLE_BADGE_CLASS: Record<MemberRole, string> = {
  org_admin: 'bg-teal-500/15 text-teal-600 border-teal-200',
  supervisor: 'bg-blue-500/15 text-blue-600 border-blue-200',
  finance: 'bg-amber-500/15 text-amber-700 border-amber-200',
  maintenance: 'bg-orange-500/15 text-orange-600 border-orange-200',
  tenant: 'bg-gray-500/15 text-gray-600 border-gray-200',
};

/** Roles admin can create — not org_admin, not tenant. */
const CREATE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'finance', label: 'Finance' },
  { value: 'maintenance', label: 'Maintenance' },
];

/** Roles that need building assignment. */
const BUILDING_SCOPED_ROLES: AssignableRole[] = ['supervisor', 'maintenance'];

// ── Zod schema ───────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  role: z.enum(['supervisor', 'finance', 'maintenance'] as const),
  buildingIds: z.array(z.string()).optional(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

// ── Edit assignments schema ───────────────────────────────────────────────────

// ── Avatar initials helper ────────────────────────────────────────────────────

function getInitials(
  username?: string | null,
  fullName?: string | null,
  email?: string | null,
): string {
  if (fullName) {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? '?';
}

/** Pull the server-provided message off a rejected RTK Query error. */
function apiErrorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

// ── Main component ────────────────────────────────────────────────────────────

interface UsersPageProps {
  locale: string;
  dict: Record<string, unknown>;
  /** When true (supervisor viewer) → hide all create/edit/remove actions. */
  readonly?: boolean;
}

export function UsersPage({ locale, readonly = false }: UsersPageProps) {
  const { data: users, isLoading } = useListUsersQuery();
  const { data: buildings } = useListBuildingsQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [patchUser, { isLoading: patching }] = usePatchUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberResponse | null>(null);
  const [editBuildingIds, setEditBuildingIds] = useState<string[]>([]);
  const [roleTarget, setRoleTarget] = useState<MemberResponse | null>(null);
  const [newRole, setNewRole] = useState<AssignableRole>('supervisor');
  const [removeTarget, setRemoveTarget] = useState<MemberResponse | null>(null);

  // Last administrator must stay manageable-proof: removing or demoting the only
  // org_admin would lock the org out, so those actions are hidden for them.
  const adminCount = (users ?? []).filter((m) => m.role === 'org_admin').length;
  function canManageMember(member: MemberResponse): boolean {
    return member.role === 'org_admin' ? adminCount > 1 : true;
  }

  // ── Create form ────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'supervisor', buildingIds: [] },
  });

  const selectedRole = watch('role');
  const needsBuildings = BUILDING_SCOPED_ROLES.includes(selectedRole);

  async function onCreateSubmit(values: CreateUserFormValues) {
    try {
      await createUser({
        username: values.username,
        password: values.password,
        fullName: values.fullName || undefined,
        email: values.email || undefined,
        role: values.role,
        buildingIds: needsBuildings ? (values.buildingIds ?? []) : undefined,
      }).unwrap();
      toast.success(
        'Member created. Share the username and password with them directly.',
      );
      setCreateOpen(false);
      reset();
    } catch (err) {
      toast.error(
        apiErrorMessage(err, 'Failed to create member. Please try again.'),
      );
    }
  }

  // ── Change role ──────────────────────────────────────────────────────────────

  function openChangeRole(member: MemberResponse) {
    setRoleTarget(member);
    // Default the selector to the member's current role when it is assignable,
    // otherwise fall back to the first assignable role (e.g. demoting an admin).
    const assignable = CREATE_ROLES.find((r) => r.value === member.role)?.value;
    setNewRole(assignable ?? 'supervisor');
  }

  async function handleChangeRole() {
    if (!roleTarget) return;
    // No-op if the role is unchanged — avoid a pointless PATCH + timeline event.
    if (newRole === roleTarget.role) {
      setRoleTarget(null);
      return;
    }
    try {
      await patchUser({
        id: roleTarget.userId,
        body: { role: newRole },
      }).unwrap();
      toast.success('Member role updated.');
      setRoleTarget(null);
    } catch (err) {
      toast.error(
        apiErrorMessage(err, 'Failed to update role. Please try again.'),
      );
    }
  }

  // ── Edit assignments ───────────────────────────────────────────────────────

  function openEditAssignments(member: MemberResponse) {
    setEditTarget(member);
    setEditBuildingIds(member.buildingIds ?? []);
  }

  async function handleSaveAssignments() {
    if (!editTarget) return;
    try {
      await patchUser({
        // Backend keys members by Keycloak user id, not the Membership row id.
        id: editTarget.userId,
        body: { buildingIds: editBuildingIds },
      }).unwrap();
      toast.success('Building assignments updated.');
      setEditTarget(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update assignments.'));
    }
  }

  function toggleBuildingId(id: string, checked: boolean) {
    setEditBuildingIds((prev) =>
      checked ? [...prev, id] : prev.filter((b) => b !== id),
    );
  }

  // ── Remove member ──────────────────────────────────────────────────────────

  async function handleRemove() {
    if (!removeTarget) return;
    try {
      await deleteUser(removeTarget.userId).unwrap();
      toast.success('Member removed from the organization.');
      setRemoveTarget(null);
    } catch (err) {
      toast.error(
        apiErrorMessage(err, 'Failed to remove member. Please try again.'),
      );
    }
  }

  // ── Enable / disable member ──────────────────────────────────────────────────

  async function handleToggleEnabled(member: MemberResponse) {
    const next = member.enabled === false; // currently disabled → enabling
    try {
      await patchUser({
        id: member.userId,
        body: { enabled: next },
      }).unwrap();
      toast.success(next ? 'Member enabled.' : 'Member disabled.');
    } catch (err) {
      toast.error(
        apiErrorMessage(err, 'Failed to update member. Please try again.'),
      );
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function displayName(member: MemberResponse): string {
    return (
      member.user?.fullName ?? member.username ?? member.user?.email ?? '—'
    );
  }

  function memberNeedsBuildings(member: MemberResponse): boolean {
    return BUILDING_SCOPED_ROLES.includes(member.role as AssignableRole);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {readonly
              ? 'Staff members in your assigned buildings.'
              : 'Manage your organization members and their roles.'}
          </p>
        </div>
        {!readonly && (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Add member
          </Button>
        )}
        {readonly && (
          <Badge
            variant="outline"
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <EyeIcon className="size-3" />
            Read-only
          </Badge>
        )}
      </div>

      {/* Members table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Buildings</TableHead>
              <TableHead>Joined</TableHead>
              {!readonly && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {!readonly && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readonly ? 4 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  <UserIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No members yet.
                </TableCell>
              </TableRow>
            ) : (
              users?.map((member) => (
                <TableRow key={member.id}>
                  {/* Avatar + Name */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="default">
                        <AvatarFallback>
                          {getInitials(
                            member.username,
                            member.user?.fullName,
                            member.user?.email,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium leading-snug truncate">
                          {displayName(member)}
                        </span>
                        {member.username && (
                          <span className="text-xs text-muted-foreground truncate">
                            @{member.username}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {member.role ? (
                        <Badge
                          variant="outline"
                          className={ROLE_BADGE_CLASS[member.role] ?? ''}
                        >
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {member.enabled === false && (
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground"
                        >
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Building count */}
                  <TableCell>
                    {memberNeedsBuildings(member) ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2Icon className="size-3 shrink-0" />
                        {(member.buildingIds ?? []).length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="text-sm text-muted-foreground">
                    {member.createdAt
                      ? formatDistanceToNow(new Date(member.createdAt), {
                          addSuffix: true,
                          locale: locale === 'ar' ? ar : undefined,
                        })
                      : '—'}
                  </TableCell>

                  {/* Actions (admin only) */}
                  {!readonly && (
                    <TableCell>
                      {(memberNeedsBuildings(member) ||
                        canManageMember(member)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Member actions"
                              >
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            {memberNeedsBuildings(member) && (
                              <DropdownMenuItem
                                onClick={() => openEditAssignments(member)}
                              >
                                Edit assignments
                              </DropdownMenuItem>
                            )}
                            {canManageMember(member) && (
                              <DropdownMenuItem
                                onClick={() => openChangeRole(member)}
                              >
                                Change role
                              </DropdownMenuItem>
                            )}
                            {canManageMember(member) && (
                              <DropdownMenuItem
                                onClick={() => handleToggleEnabled(member)}
                              >
                                {member.enabled === false
                                  ? 'Enable login'
                                  : 'Disable login'}
                              </DropdownMenuItem>
                            )}
                            {canManageMember(member) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setRemoveTarget(member)}
                                >
                                  Remove member
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create Member Dialog ───────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-username"
                placeholder="jane.smith"
                autoComplete="off"
                aria-invalid={!!errors.username}
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Full name (optional) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-fullName">
                Full name{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="create-fullName"
                placeholder="Jane Smith"
                {...register('fullName')}
              />
            </div>

            {/* Email (optional) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-email">
                Email{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="jane@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) =>
                      field.onChange(val as AssignableRole)
                    }
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!errors.role}
                    >
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATE_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="text-xs text-destructive">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Building assignment — shown for supervisor / maintenance */}
            {needsBuildings && buildings && buildings.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>
                  Assign buildings{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <div className="rounded-md border bg-muted/30 divide-y max-h-36 overflow-y-auto">
                  {buildings.map((b) => (
                    <Controller
                      key={b.id}
                      control={control}
                      name="buildingIds"
                      render={({ field }) => (
                        <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm">
                          <input
                            type="checkbox"
                            className="rounded"
                            value={b.id}
                            checked={(field.value ?? []).includes(b.id)}
                            onChange={(e) => {
                              const current = field.value ?? [];
                              field.onChange(
                                e.target.checked
                                  ? [...current, b.id]
                                  : current.filter((id) => id !== b.id),
                              );
                            }}
                          />
                          <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                          {b.name}
                        </label>
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  reset();
                }}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Assignments Dialog ────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit building assignments</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <p className="text-sm text-muted-foreground">
              Assign buildings to{' '}
              <span className="font-medium text-foreground">
                {editTarget ? displayName(editTarget) : 'this member'}
              </span>
              .
            </p>

            {buildings && buildings.length > 0 ? (
              <div className="rounded-md border bg-muted/30 divide-y max-h-48 overflow-y-auto">
                {buildings.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded"
                      value={b.id}
                      checked={editBuildingIds.includes(b.id)}
                      onChange={(e) => toggleBuildingId(b.id, e.target.checked)}
                    />
                    <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    {b.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No buildings found. Create buildings first.
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setEditTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button onClick={handleSaveAssignments} disabled={patching}>
              {patching ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Role Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!roleTarget}
        onOpenChange={(open) => {
          if (!open) setRoleTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <p className="text-sm text-muted-foreground">
              Set the role for{' '}
              <span className="font-medium text-foreground">
                {roleTarget ? displayName(roleTarget) : 'this member'}
              </span>
              .
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="change-role">Role</Label>
              <Select
                value={newRole}
                onValueChange={(val) => setNewRole(val as AssignableRole)}
              >
                <SelectTrigger id="change-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {CREATE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setRoleTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button onClick={handleChangeRole} disabled={patching}>
              {patching ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
          </DialogHeader>

          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove{' '}
              <span className="font-medium text-foreground">
                {removeTarget ? displayName(removeTarget) : 'this member'}
              </span>{' '}
              from the organization? This action cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={deleting}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
