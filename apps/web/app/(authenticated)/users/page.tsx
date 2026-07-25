'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Users as UsersIcon, Plus, Pencil, Mail } from 'lucide-react';
import {
  userCreateRequestSchema,
  userUpdateRequestSchema,
  DEFAULT_PAGE_SIZE,
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
  useResendUserInvitation,
} from '@/hooks/use-users';
import { ApiError } from '@/lib/api';
import { ForbiddenPage } from '@/components/forbidden-page';
import { ActivationStatusBadge } from '@/components/activation-status-badge';
import { StatusBadge } from '@/components/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { Pagination } from '@/components/pagination';
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

const ROLE_LABELS: Record<string, string> = {
  STAFF: 'Staff',
  PROFESSIONAL: 'Professional',
  INSTITUTION_ADMIN: 'Institution Admin',
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
            Adds a staff member, professional, or institution admin and emails
            them an invitation to log in.
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
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              {...register('role')}
            >
              <option value="STAFF">Staff</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="INSTITUTION_ADMIN">Institution Admin</option>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
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
    // `values` (not `defaultValues`) so the form rehydrates when the row's
    // user data changes or the dialog is reopened after an edit.
    values: {
      fullName: user.fullName,
      phone: user.phone,
      specialty: user.specialty ?? undefined,
      bio: user.bio ?? undefined,
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({
  user,
  isSelf,
}: {
  user: UserListItem;
  isSelf: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { resendInvitation } = useResendUserInvitation();
  const [isResending, setIsResending] = useState(false);

  if (isSelf) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block" tabIndex={0}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
              aria-label="Edit (manage your own account from Profile)"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Manage your own account from Profile</TooltipContent>
      </Tooltip>
    );
  }

  const onResend = async () => {
    setIsResending(true);
    try {
      await resendInvitation(user.id);
      toast.success('Invitation resent');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to resend invite',
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      {!user.isConfirmed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onResend}
          disabled={isResending}
          aria-label="Resend invitation"
        >
          <Mail className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setEditOpen(true)}
        aria-label="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

export default function UsersPage() {
  const { user, isLoading: userLoading } = useUser();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const isAdmin = user?.role === 'INSTITUTION_ADMIN';

  // Debounced so a full re-fetch (and skeleton-replacing-table flash) doesn't
  // fire on every keystroke — same pattern as the care-team professional picker.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { users, total, isLoading, error } = useUsers({
    role: roleFilter === 'all' ? undefined : roleFilter,
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
    enabled: isAdmin,
  });
  const { setUserStatus } = useSetUserStatus();

  // Clamp back to the last valid page if a filter/pageSize change or a
  // background revalidation shrinks `total` out from under the current page.
  useEffect(() => {
    if (total === undefined) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [total, pageSize, page]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Staff & Doctors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff and professional accounts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-56"
          />
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value as RoleFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="PROFESSIONAL">Professional</SelectItem>
              <SelectItem value="INSTITUTION_ADMIN">
                Institution Admin
              </SelectItem>
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
              <span className="text-sm font-normal text-muted-foreground">
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
            <div className="py-10 text-center text-muted-foreground">
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
                {users.map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          {u.fullName}
                          {isSelf && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {u.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ROLE_LABELS[u.role] || u.role}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.specialty || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <StatusBadge
                                  status={u.isActive ? 'ACTIVE' : 'INACTIVE'}
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Manage your own account from Profile
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <ActivationStatusBadge
                            isActive={u.isActive}
                            name={u.fullName}
                            entityLabel={
                              u.role === 'PROFESSIONAL'
                                ? 'professional'
                                : u.role === 'INSTITUTION_ADMIN'
                                  ? 'institution admin'
                                  : 'staff member'
                            }
                            onConfirm={async () => {
                              try {
                                await setUserStatus(u.id, !u.isActive);
                                toast.success(
                                  u.isActive
                                    ? 'User deactivated'
                                    : 'User reactivated',
                                );
                              } catch (error) {
                                toast.error(
                                  error instanceof ApiError
                                    ? error.message
                                    : 'Failed to update status',
                                );
                                throw error;
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <UserRowActions user={u} isSelf={isSelf} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {total !== undefined && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
