'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, ShieldX, Trash2, UserMinus } from 'lucide-react';
import type { MemberRole } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useGroup } from '@/hooks/use-groups';
import { useMembers } from '@/hooks/use-members';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ROLE_COLORS: Record<MemberRole, string> = {
  ADMIN: 'bg-primary-100 text-primary-base',
  PRESENTER: 'bg-warning-light text-gray-900',
};

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

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

export default function GroupDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  const { group, isLoading, error, remove, assignMembers, removeMember } =
    useGroup(id, { enabled: isAdmin });

  const { members: orgMembers } = useMembers({
    enabled: isAdmin && !!group,
    organizationId:
      user?.role === 'SUPER_ADMIN' ? group?.organizationId : undefined,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const assignedIds = useMemo(
    () => new Set(group?.members.map((m) => m.id) ?? []),
    [group?.members],
  );

  const availableMembers = useMemo(
    () => (orgMembers ?? []).filter((m) => !assignedIds.has(m.id)),
    [orgMembers, assignedIds],
  );

  if (userLoading || (isAdmin && isLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <ForbiddenPage />;
  }

  if (error || !group) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2 text-gray-600"
          onClick={() => router.push('/groups')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            Group not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleMember = (memberId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, memberId] : prev.filter((id) => id !== memberId),
    );
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    setIsAssigning(true);
    try {
      await assignMembers({ memberIds: selectedIds });
      setSelectedIds([]);
      toast.success('Members added to group');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to add members');
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast.success('Member removed from group');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to remove member');
      }
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(`Delete group "${group.name}"? This cannot be undone.`)
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await remove();
      toast.success('Group deleted');
      router.push('/groups');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to delete group');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        className="gap-2 text-gray-600"
        onClick={() => router.push('/groups')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Groups
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {group.description || 'No description'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/groups/${group.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-error hover:text-error"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members in group</CardTitle>
        </CardHeader>
        <CardContent>
          {!group.members.length ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No members assigned yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.username}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-error hover:text-error"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!availableMembers.length ? (
            <p className="text-sm text-gray-500">
              All organization members are already in this group, or none are
              available.
            </p>
          ) : (
            <>
              <div className="custom-scrollbar max-h-64 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-4">
                {availableMembers.map((member) => {
                  const checked = selectedIds.includes(member.id);
                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleMember(member.id, value === true)
                        }
                      />
                      <Label
                        htmlFor={`member-${member.id}`}
                        className="flex flex-1 cursor-pointer items-center justify-between"
                      >
                        <span>{member.username}</span>
                        <RoleBadge role={member.role} />
                      </Label>
                    </div>
                  );
                })}
              </div>
              <Button
                disabled={selectedIds.length === 0 || isAssigning}
                className="bg-primary-base hover:bg-primary-base/90"
                onClick={handleAssign}
              >
                {isAssigning
                  ? 'Adding...'
                  : `Add ${selectedIds.length || ''} member${selectedIds.length === 1 ? '' : 's'}`.trim()}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
