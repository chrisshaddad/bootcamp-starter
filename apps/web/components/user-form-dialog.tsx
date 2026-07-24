'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { userRoleSchema, type UserAccountResponse } from '@repo/contracts';
import { useOrganizations } from '@/hooks/use-organizations';
import { useDepartments } from '@/hooks/use-departments';
import { useUser } from '@/hooks/use-auth';
import { useUsers, useUserMutations } from '@/hooks/use-users';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  HR: 'HR',
  EMPLOYEE: 'Employee',
};

const NONE_VALUE = 'none';

// Local form schema (not the contract's create/update schemas directly) -
// organizationId is required here whenever the role needs one; that's
// enforced in onSubmit rather than via a cross-field zod refine so the error
// can be attached to a specific field either way.
const userFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email'),
  role: userRoleSchema,
  organizationId: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  title: z.string().max(100).optional(),
  level: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserAccountResponse;
  defaultOrganizationId?: string;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  defaultOrganizationId,
}: UserFormDialogProps) {
  const isEdit = !!user;
  const { user: currentUser } = useUser({ redirectOnUnauthenticated: false });
  // An ORG_ADMIN manages only their own org, so the org is locked and platform
  // admins can't be minted here; SUPER_ADMIN keeps the full org/role picker.
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const lockedOrganizationId = isSuperAdmin
    ? undefined
    : (currentUser?.organizationId ?? undefined);
  const { organizations } = useOrganizations({
    status: 'ACTIVE',
    enabled: isSuperAdmin,
  });
  const { createUser, updateUser } = useUserMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
  });

  const role = watch('role');
  const organizationId = watch('organizationId');
  const needsOrganization = role !== 'SUPER_ADMIN';

  const { departments } = useDepartments({
    organizationId,
    enabled: open && needsOrganization && !!organizationId,
  });
  const { users: managers } = useUsers({
    organizationId,
    enabled: open && needsOrganization && !!organizationId,
  });

  useEffect(() => {
    if (!open) return;

    reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'EMPLOYEE',
      organizationId:
        user?.organization?.id ??
        defaultOrganizationId ??
        lockedOrganizationId ??
        undefined,
      departmentId: user?.department?.id ?? NONE_VALUE,
      managerId: user?.manager?.id ?? NONE_VALUE,
      title: user?.title ?? '',
      level: user?.level != null ? String(user.level) : '',
    });
  }, [open, user, defaultOrganizationId, lockedOrganizationId, reset]);

  const onSubmit = async (values: UserFormValues) => {
    const requiresOrg = values.role !== 'SUPER_ADMIN';
    if (requiresOrg && !values.organizationId) {
      toast.error('Select an organization for this role');
      return;
    }

    setIsSubmitting(true);
    try {
      const departmentId =
        values.departmentId && values.departmentId !== NONE_VALUE
          ? values.departmentId
          : undefined;
      const managerId =
        values.managerId && values.managerId !== NONE_VALUE
          ? values.managerId
          : undefined;
      const level = values.level ? parseInt(values.level, 10) : undefined;

      if (isEdit && user) {
        await updateUser(user.id, {
          role: values.role,
          departmentId: departmentId ?? null,
          managerId: managerId ?? null,
          title: values.title || null,
          level: level ?? null,
        });
        toast.success('User updated');
      } else {
        await createUser({
          name: values.name,
          email: values.email,
          role: values.role,
          organizationId: requiresOrg ? values.organizationId : undefined,
          departmentId,
          managerId,
          title: values.title || undefined,
          level,
        });
        toast.success('User created');
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                aria-invalid={!!errors.name}
                disabled={isEdit}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-error">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@acme.com"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                aria-invalid={!!errors.email}
                disabled={isEdit}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-error">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="role"
                      className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS)
                        .filter(
                          ([value]) => isSuperAdmin || value !== 'SUPER_ADMIN',
                        )
                        .map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {needsOrganization && isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization</Label>
                <Controller
                  name="organizationId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEdit}
                    >
                      <SelectTrigger
                        id="organizationId"
                        className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                      >
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {(organizations ?? []).map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>

          {needsOrganization && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department (optional)</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!organizationId}
                    >
                      <SelectTrigger
                        id="departmentId"
                        className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                      >
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {(departments ?? []).map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerId">Manager (optional)</Label>
                <Controller
                  name="managerId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!organizationId}
                    >
                      <SelectTrigger
                        id="managerId"
                        className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                      >
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {(managers ?? [])
                          .filter((manager) => manager.id !== user?.id)
                          .map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="e.g. Software Engineer"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                {...register('title')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level (optional)</Label>
              <Input
                id="level"
                type="number"
                min={1}
                placeholder="e.g. 3"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                {...register('level')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary-base hover:bg-primary-base/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Add User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
