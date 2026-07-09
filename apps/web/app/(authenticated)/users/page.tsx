'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-users';
import { cn, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, ShieldX, Search } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  createUserRequestSchema,
  updateUserRequestSchema,
  type CreateUserRequest,
  type UpdateUserRequest,
  type UserListItem,
} from '@repo/contracts';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  RECEPTIONIST: 'Receptionist',
  MEMBER: 'Member',
};

// Role badges — tinted pill + tick square, keyed off palette tokens.
const ROLE_BADGE: Record<string, { cls: string; tick: string }> = {
  SUPER_ADMIN: { cls: 'bg-spine/15 text-spine border-spine/30', tick: 'bg-spine' },
  ORG_ADMIN: {
    cls: 'bg-sunken text-text-1 border-border-strong',
    tick: 'bg-text-1',
  },
  RECEPTIONIST: {
    cls: 'bg-amber-soft text-amber-strong border-amber/35',
    tick: 'bg-amber',
  },
  MEMBER: { cls: 'bg-transparent text-text-2 border-border', tick: 'bg-text-3' },
};

function RoleBadge({ role }: { role: string }) {
  const v = ROLE_BADGE[role] ?? ROLE_BADGE.MEMBER!;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-bold',
        v.cls,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-[1.5px]', v.tick)} />
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// Active when confirmed, otherwise still an outstanding invite.
function StatusPill({ confirmed }: { confirmed: boolean }) {
  if (confirmed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-success">
        <span className="h-[7px] w-[7px] rounded-full bg-success ring-[3px] ring-success/20" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-strong">
      <span className="h-[7px] w-[7px] rounded-full bg-amber ring-[3px] ring-amber/25" />
      Invited
    </span>
  );
}

// Soft per-person avatar tints (design tokens in globals.css), chosen stably by id.
const AVATAR_TINTS = [
  'bg-avatar-1-bg text-avatar-1-fg',
  'bg-avatar-2-bg text-avatar-2-fg',
  'bg-avatar-3-bg text-avatar-3-fg',
  'bg-avatar-4-bg text-avatar-4-fg',
  'bg-avatar-5-bg text-avatar-5-fg',
];

function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length]!;
}

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  if (name.trim()) return name.trim().charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-danger" />
      <h1 className="mb-2 font-display text-2xl font-medium text-text-1">
        Access Denied
      </h1>
      <p className="max-w-md text-center text-text-2">
        You don&apos;t have permission to access this page.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-40" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'ORG_ADMIN', label: 'Org Admin' },
] as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-danger">{message}</p>;
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[11px] border border-border bg-surface px-[15px] py-3 shadow-sm">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-text-3">
        {label}
      </div>
      <div className="mt-[3px] font-display text-[26px] font-medium text-text-1">
        {value}
      </div>
    </div>
  );
}

function OrgAdminUsersView() {
  const { users, total, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [search, setSearch] = useState('');

  const createForm = useForm<CreateUserRequest>({
    resolver: zodResolver(createUserRequestSchema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', role: 'MEMBER' },
  });

  const editForm = useForm<UpdateUserRequest>({
    resolver: zodResolver(updateUserRequestSchema),
    mode: 'onChange',
    defaultValues: { name: '', role: 'MEMBER' },
  });

  const activeCount = useMemo(
    () => (users ?? []).filter((u) => u.isConfirmed).length,
    [users],
  );
  const pendingCount = (users?.length ?? 0) - activeCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const handleCreate = createForm.handleSubmit(async (data) => {
    try {
      await createUser(data);
      toast.success('User created successfully');
      setShowCreateDialog(false);
      createForm.reset();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create user'));
      console.error(err);
    }
  });

  const openEdit = (user: UserListItem) => {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      role: user.role as UpdateUserRequest['role'],
    });
  };

  const handleUpdate = editForm.handleSubmit(async (data) => {
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, data);
      toast.success('User updated successfully');
      setEditingUser(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update user'));
      console.error(err);
    }
  });

  return (
    <div className="space-y-6">
      {/* Page head */}
      <div className="flex items-end justify-between gap-3.5">
        <div>
          <h1 className="font-display text-[26px] font-medium text-text-1">
            Users
          </h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Every person on record in your organization.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="On record" value={total ?? users?.length ?? 0} />
        <Kpi label="Active" value={activeCount} />
        <Kpi label="Pending" value={pendingCount} />
      </div>

      {/* Deck table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {/* toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex min-w-[190px] items-center gap-2 rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-text-3 focus-within:border-border-strong">
            <Search className="h-3.5 w-3.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users"
              className="w-full bg-transparent text-[12.5px] text-text-1 outline-none placeholder:text-text-3"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="py-10 text-center text-danger">
            Failed to load users
          </div>
        ) : !users?.length ? (
          <div className="py-10 text-center text-text-2">
            No users found. Create your first user above.
          </div>
        ) : !filtered.length ? (
          <div className="py-10 text-center text-text-2">
            No users match “{search}”.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto w-10 border-r border-border bg-sunken px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  #
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Name
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Role
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Status
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Added
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user, i) => (
                <TableRow key={user.id} className="hover:bg-amber/5">
                  <TableCell className="w-10 border-r border-border px-3.5 py-2.5 text-right font-mono text-[11px] text-text-3">
                    {String(i + 1).padStart(3, '0')}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold',
                          tintFor(user.id),
                        )}
                      >
                        {initials(user.name, user.email)}
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-text-1">
                          {user.name}
                        </div>
                        <div className="font-mono text-[11px] text-text-3">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5">
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5">
                    <StatusPill confirmed={user.isConfirmed} />
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 font-mono text-[12px] text-text-2">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(user)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) createForm.reset();
        }}
      >
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>
                The new user will be added to your organization and can log in
                via email once created.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  aria-invalid={!!createForm.formState.errors.name}
                  {...createForm.register('name')}
                />
                <FieldError
                  message={createForm.formState.errors.name?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  aria-invalid={!!createForm.formState.errors.email}
                  {...createForm.register('email')}
                />
                <FieldError
                  message={createForm.formState.errors.email?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Controller
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="create-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={createForm.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createForm.formState.isSubmitting ||
                  !createForm.formState.isValid
                }
              >
                {createForm.formState.isSubmitting
                  ? 'Creating...'
                  : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update {editingUser?.email}&apos;s name or role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  aria-invalid={!!editForm.formState.errors.name}
                  {...editForm.register('name')}
                />
                <FieldError message={editForm.formState.errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Controller
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={editForm.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceptionistCreateUserView() {
  const createUser = useCreateUser();

  const form = useForm<CreateUserRequest>({
    resolver: zodResolver(createUserRequestSchema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', role: 'MEMBER' },
  });

  const handleCreate = form.handleSubmit(async (data) => {
    try {
      await createUser({ ...data, role: 'MEMBER' });
      toast.success('User created successfully');
      form.reset();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create user'));
      console.error(err);
    }
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-[26px] font-medium text-text-1">
          Create User
        </h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Add a new member to your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rec-name">Name</Label>
              <Input
                id="rec-name"
                aria-invalid={!!form.formState.errors.name}
                {...form.register('name')}
              />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-email">Email</Label>
              <Input
                id="rec-email"
                type="email"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              <FieldError message={form.formState.errors.email?.message} />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {form.formState.isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (user?.role === 'ORG_ADMIN') {
    return <OrgAdminUsersView />;
  }

  if (user?.role === 'RECEPTIONIST') {
    return <ReceptionistCreateUserView />;
  }

  return <ForbiddenPage />;
}
