'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-users';
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
import { UserPlus, Users, ShieldX } from 'lucide-react';
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
  ORG_ADMIN: 'Org Admin',
  RECEPTIONIST: 'Receptionist',
  MEMBER: 'Member',
};

// Uses design tokens (blue/purple/gray) from globals.css rather than raw Tailwind palette.
const ROLE_COLORS: Record<string, string> = {
  ORG_ADMIN: 'bg-purple/10 text-purple',
  RECEPTIONIST: 'bg-blue/10 text-blue',
  MEMBER: 'bg-gray-200 text-gray-700',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] || 'bg-gray-200 text-gray-700'}`}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="h-16 w-16 text-error mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 text-center max-w-md">
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
  return <p className="text-sm text-error">{message}</p>;
}

function OrgAdminUsersView() {
  const { users, total, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users in your organization
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Users
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load users
            </div>
          ) : !users?.length ? (
            <div className="py-10 text-center text-gray-500">
              No users found. Create your first user above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Confirmed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-gray-900">
                      {user.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {user.isConfirmed ? 'Yes' : 'Pending'}
                    </TableCell>
                    <TableCell>
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
        </CardContent>
      </Card>

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
        <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
        <p className="mt-1 text-sm text-gray-500">
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
