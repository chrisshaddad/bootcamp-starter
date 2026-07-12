'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Users as UsersIcon, Plus, MoreHorizontal } from 'lucide-react';
import {
  userCreateRequestSchema,
  userUpdateRequestSchema,
  type UserCreateRequest,
  type UserUpdateRequest,
  type UserListItem,
  type StaffRole,
} from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useSetUserStatus,
} from '@/hooks/use-users';
import { ApiError } from '@/lib/api';
import { ForbiddenPage } from '@/components/forbidden-page';
import { StatusBadge } from '@/components/status-badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROLE_LABELS: Record<string, string> = {
  STAFF: 'Staff',
  PROFESSIONAL: 'Professional',
};

type RoleFilter = 'all' | StaffRole;

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createUser } = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserCreateRequest>({
    resolver: zodResolver(userCreateRequestSchema),
    defaultValues: { role: 'STAFF' },
  });

  const role = watch('role');

  const onSubmit = async (data: UserCreateRequest) => {
    setIsSubmitting(true);
    try {
      await createUser(data);
      toast.success('User created — an invitation email has been sent');
      reset({ role: 'STAFF' });
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Adds a staff member or professional and emails them an invitation to
            log in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-error">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-error">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-error">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
              {...register('role')}
            >
              <option value="STAFF">Staff</option>
              <option value="PROFESSIONAL">Professional</option>
            </select>
          </div>

          {role === 'PROFESSIONAL' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input id="specialty" {...register('specialty')} />
                {errors.specialty && (
                  <p className="text-sm text-error">
                    {errors.specialty.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (optional)</Label>
                <Input id="bio" {...register('bio')} />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateUser } = useUpdateUser();
  const isProfessional = user.role === 'PROFESSIONAL';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserUpdateRequest>({
    resolver: zodResolver(userUpdateRequestSchema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone,
      specialty: user.specialty ?? undefined,
    },
  });

  const onSubmit = async (data: UserUpdateRequest) => {
    setIsSubmitting(true);
    try {
      await updateUser(user.id, data);
      toast.success('User updated');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update user',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">Full Name</Label>
            <Input id="edit-fullName" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-error">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-error">{errors.phone.message}</p>
            )}
          </div>
          {isProfessional && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-specialty">Specialty</Label>
                <Input id="edit-specialty" {...register('specialty')} />
                {errors.specialty && (
                  <p className="text-sm text-error">
                    {errors.specialty.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Input id="edit-bio" {...register('bio')} />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({ user }: { user: UserListItem }) {
  const { setUserStatus } = useSetUserStatus();
  const [editOpen, setEditOpen] = useState(false);

  const toggleStatus = async () => {
    try {
      await setUserStatus(user.id, !user.isActive);
      toast.success(
        user.isActive ? 'User deactivated' : 'User reactivated',
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update status',
      );
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={toggleStatus}
            className={user.isActive ? 'text-red-600 focus:text-red-600' : ''}
          >
            {user.isActive ? 'Deactivate' : 'Reactivate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

export default function UsersPage() {
  const { user, isLoading: userLoading } = useUser();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const isAdmin = user?.role === 'INSTITUTION_ADMIN';

  const {
    users,
    total,
    isLoading,
    error,
  } = useUsers({
    role: roleFilter === 'all' ? undefined : roleFilter,
    enabled: isAdmin,
  });

  if (userLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!isAdmin) {
    return (
      <ForbiddenPage message="Only institution admins can manage staff and professionals." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff & Doctors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage staff and professional accounts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as RoleFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="PROFESSIONAL">Professional</SelectItem>
            </SelectContent>
          </Select>
          <CreateUserDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Users
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
            <div className="py-10 text-center text-red-500">
              Failed to load users
            </div>
          ) : !users?.length ? (
            <div className="py-10 text-center text-gray-500">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {u.fullName}
                      </div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {ROLE_LABELS[u.role] || u.role}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {u.specialty || (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </TableCell>
                    <TableCell>
                      <UserRowActions user={u} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
