'use client';

import { useRouter } from 'next/navigation';
import { Plus, ShieldX, UsersRound } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useGroups } from '@/hooks/use-groups';
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

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        Only super admins and organization admins can manage groups.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function canAccessGroups(role: string | undefined) {
  return role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const canAccess = canAccessGroups(user?.role);

  const { groups, total, isLoading, error } = useGroups({
    enabled: canAccess,
  });

  if (userLoading || (canAccess && isLoading)) {
    return <LoadingSkeleton />;
  }

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize Coordly members for communication and targeting
            {typeof total === 'number' ? ` · ${total} total` : ''}
          </p>
        </div>
        <Button
          className="gap-2 bg-primary-base hover:bg-primary-base/90"
          onClick={() => router.push('/groups/new')}
        >
          <Plus className="h-4 w-4" />
          Create group
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-error">
            Failed to load groups
          </CardContent>
        </Card>
      ) : !groups?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <UsersRound className="mb-4 h-12 w-12 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900">
              No groups yet
            </h2>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Create a group to organize members in your organization.
            </p>
            <Button
              className="mt-6 gap-2 bg-primary-base hover:bg-primary-base/90"
              onClick={() => router.push('/groups/new')}
            >
              <Plus className="h-4 w-4" />
              Create group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All groups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/groups/${group.id}`)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {group.name}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-gray-500">
                      {group.description || '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {group.memberCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
