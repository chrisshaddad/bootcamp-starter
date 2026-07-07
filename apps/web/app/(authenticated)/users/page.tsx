'use client';

import { useState } from 'react';
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
import type { AssignableUserRole, UserListItem } from '@repo/contracts';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Org Admin',
  RECEPTIONIST: 'Receptionist',
  MEMBER: 'Member',
};

const ROLE_COLORS: Record<string, string> = {
  ORG_ADMIN: 'bg-purple-100 text-purple-800',
  RECEPTIONIST: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-800',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}`}
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

interface UserFormState {
  name: string;
  email: string;
  role: AssignableUserRole;
}

const EMPTY_FORM: UserFormState = { name: '', email: '', role: 'MEMBER' };

function OrgAdminUsersView() {
  const { users, total, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormState>(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createUser(createForm);
      toast.success('User created successfully');
      setShowCreateDialog(false);
      setCreateForm(EMPTY_FORM);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create user'));
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (user: UserListItem) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role as AssignableUserRole,
    });
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    setIsEditing(true);
    try {
      await updateUser(editingUser.id, {
        name: editForm.name,
        role: editForm.role,
      });
      toast.success('User updated successfully');
      setEditingUser(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update user'));
      console.error(err);
    } finally {
      setIsEditing(false);
    }
  };

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
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              The new user will be added to your organization and can log in via
              email once created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm((f) => ({
                    ...f,
                    role: value as AssignableUserRole,
                  }))
                }
              >
                <SelectTrigger id="create-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !createForm.name || !createForm.email}
            >
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update {editingUser?.email}&apos;s name or role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm((f) => ({
                    ...f,
                    role: value as AssignableUserRole,
                  }))
                }
              >
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isEditing || !editForm.name}
            >
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceptionistCreateUserView() {
  const createUser = useCreateUser();
  const [form, setForm] = useState({ name: '', email: '' });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createUser({ ...form, role: 'MEMBER' });
      toast.success('User created successfully');
      setForm({ name: '', email: '' });
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create user'));
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rec-name">Name</Label>
            <Input
              id="rec-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-email">Email</Label>
            <Input
              id="rec-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={isCreating || !form.name || !form.email}
          >
            {isCreating ? 'Creating...' : 'Create User'}
          </Button>
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
