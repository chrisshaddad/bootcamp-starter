'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Users as UsersIcon, Search } from 'lucide-react';

import type { UserRole, UserSummary } from '@repo/contracts';
import { useUsers } from '@/hooks/use-users';
import { useDebounce } from '@/hooks/use-debounce';
import { ApiError } from '@/lib/api';
import { RequireRole } from '@/components/require-role';
import { StatusBadge } from '@/components/status-badge';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 20;

const ROLES: UserRole[] = ['SUPER_ADMIN', 'ORG_ADMIN', 'LIBRARIAN', 'MEMBER'];

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  LIBRARIAN: 'Librarian',
  MEMBER: 'Member',
};

const CONFIRMED_LABELS: Record<string, string> = {
  true: 'Confirmed',
  false: 'Pending',
};
const CONFIRMED_COLORS: Record<string, string> = {
  true: 'bg-success-light text-success-dark',
  false: 'bg-warning-light text-warning-dark',
};

function fmtDate(value?: Date | string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function UsersPage() {
  return (
    <RequireRole
      roles={['SUPER_ADMIN']}
      forbiddenMessage="Only platform administrators can manage users."
    >
      <UsersManager />
    </RequireRole>
  );
}

function UsersManager() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { users, total, isLoading, changeRole, unlinkOrg, remove } = useUsers({
    search: debouncedSearch,
    role: roleFilter === 'ALL' ? undefined : roleFilter,
    page,
    limit: PAGE_SIZE,
  });

  const [unlinking, setUnlinking] = useState<UserSummary | null>(null);
  const [deleting, setDeleting] = useState<UserSummary | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const handleRoleChange = async (user: UserSummary, role: UserRole) => {
    if (role === user.role) return;
    setPending(user.id);
    try {
      await changeRole(user.id, role);
      toast.success(`Role updated to ${ROLE_LABELS[role]}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update role',
      );
    } finally {
      setPending(null);
    }
  };

  const handleUnlink = async () => {
    if (!unlinking) return;
    setPending(unlinking.id);
    try {
      await unlinkOrg(unlinking.id);
      toast.success('User unlinked from organization');
      setUnlinking(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to unlink');
    } finally {
      setPending(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setPending(deleting.id);
    try {
      await remove(deleting.id);
      toast.success('User deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to delete user',
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every account across the platform.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as UserRole | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            All users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !users?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-foreground">
                        {user.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(v) =>
                            handleRoleChange(user, v as UserRole)
                          }
                          disabled={pending !== null}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.organization?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={String(user.isConfirmed)}
                          labels={CONFIRMED_LABELS}
                          colors={CONFIRMED_COLORS}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.organizationId && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending !== null}
                              onClick={() => setUnlinking(user)}
                            >
                              Unlink org
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending !== null}
                            onClick={() => setDeleting(user)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                total={total ?? 0}
                limit={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!unlinking}
        onOpenChange={(open) => !open && setUnlinking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink from organization?</DialogTitle>
            <DialogDescription>
              {unlinking?.name} will be detached from{' '}
              {unlinking?.organization?.name ?? 'their organization'}. Their
              login stays intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinking(null)}>
              Cancel
            </Button>
            <Button disabled={pending !== null} onClick={handleUnlink}>
              {pending ? 'Unlinking…' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.name} ({deleting?.email}) and
              their sessions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending !== null}
              onClick={handleDelete}
            >
              {pending ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
