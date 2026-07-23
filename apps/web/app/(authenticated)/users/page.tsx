'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';
import { useUsers, useUserMutations } from '@/hooks/use-users';
import { ForbiddenPage } from '@/components/forbidden-page';
import { UserFormDialog } from '@/components/user-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pencil,
  PauseCircle,
  PlayCircle,
  Plus,
  UsersRound,
} from 'lucide-react';
import type { UserAccountResponse, UserRole } from '@repo/contracts';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  HR: 'HR',
  EMPLOYEE: 'Employee',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Active' : 'Deactivated'}
    </span>
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

function UsersContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? 'all',
  );
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccountResponse | null>(
    null,
  );
  const [deactivatingUser, setDeactivatingUser] =
    useState<UserAccountResponse | null>(null);
  const [reactivatingUser, setReactivatingUser] =
    useState<UserAccountResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { organizations } = useOrganizations({ enabled: isSuperAdmin });
  const {
    users,
    total,
    isLoading: usersLoading,
    error,
  } = useUsers({
    organizationId:
      organizationFilter === 'all' ? undefined : organizationFilter,
    role: roleFilter === 'all' ? undefined : roleFilter,
    enabled: isSuperAdmin,
  });
  const { deactivateUser, reactivateUser } = useUserMutations();

  if (!isSuperAdmin) {
    return <ForbiddenPage message="Only Super Admins can manage users." />;
  }

  const handleDeactivate = async () => {
    if (!deactivatingUser) return;
    setIsProcessing(true);
    try {
      await deactivateUser(deactivatingUser.id);
      toast.success('User deactivated');
      setDeactivatingUser(null);
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivatingUser) return;
    setIsProcessing(true);
    try {
      await reactivateUser(reactivatingUser.id);
      toast.success('User reactivated');
      setReactivatingUser(null);
    } catch {
      toast.error('Failed to reactivate user');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts across all organizations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={organizationFilter}
            onValueChange={setOrganizationFilter}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {(organizations ?? []).map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as 'all' | UserRole)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="gap-2 bg-primary-base hover:bg-primary-base/90"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Users
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
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
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {u.name}
                        </div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {u.organization?.name ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {u.department?.name ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge isActive={u.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditingUser(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {u.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-orange-600 hover:text-orange-700"
                            onClick={() => setDeactivatingUser(u)}
                          >
                            <PauseCircle className="h-3.5 w-3.5" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-green-600 hover:text-green-700"
                            onClick={() => setReactivatingUser(u)}
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultOrganizationId={
          organizationFilter === 'all' ? undefined : organizationFilter
        }
      />

      <UserFormDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser ?? undefined}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={!!deactivatingUser}
        onOpenChange={(open) => !open && setDeactivatingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{deactivatingUser?.name}</strong>? They will be signed out
              immediately and won&apos;t be able to sign back in until
              reactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivatingUser(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Confirmation Dialog */}
      <Dialog
        open={!!reactivatingUser}
        onOpenChange={(open) => !open && setReactivatingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate{' '}
              <strong>{reactivatingUser?.name}</strong>? They will be able to
              sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivatingUser(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleReactivate}
              disabled={isProcessing}
            >
              {isProcessing ? 'Reactivating...' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <UsersContent />
    </Suspense>
  );
}
