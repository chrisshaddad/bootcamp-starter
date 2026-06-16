'use client';

import { useUser } from '@/hooks/use-auth';
import { useMembers } from '@/hooks/use-members';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldX } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-800',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}`}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-red-400" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to access this page. Only Super Admins
        and Organization Admins can view members.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function truncateId(id: string) {
  return `${id.slice(0, 8)}…`;
}

function canAccessMembers(role: string | undefined) {
  return role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
}

export default function MembersPage() {
  const { user, isLoading: userLoading } = useUser();
  const canAccess = canAccessMembers(user?.role);

  const {
    members,
    total,
    isLoading: membersLoading,
    error,
  } = useMembers({
    enabled: canAccess,
  });

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isSuperAdmin
            ? 'Coordly domain members across all organizations'
            : 'Members in your organization'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">
              Failed to load members
            </div>
          ) : !members?.length ? (
            <div className="py-10 text-center text-gray-500">
              No members found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead>Organization ID</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-sm text-gray-500">
                      {truncateId(member.id)}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {member.username}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="font-mono text-sm text-gray-500">
                        {truncateId(member.organizationId)}
                      </TableCell>
                    )}
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
