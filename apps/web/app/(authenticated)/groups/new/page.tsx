'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ShieldX } from 'lucide-react';
import type { GroupCreateRequest } from '@repo/contracts';
import { CreateGroupForm } from '@/components/group-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-auth';
import { useGroups } from '@/hooks/use-groups';
import { ApiError } from '@/lib/api';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to create groups.
      </p>
    </div>
  );
}

export default function NewGroupPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { create } = useGroups({ enabled: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return <ForbiddenPage />;
  }

  const handleSubmit = async (
    data: GroupCreateRequest,
    organizationId?: string,
  ) => {
    setIsSubmitting(true);
    try {
      const group = await create(data, organizationId);
      toast.success('Group created');
      router.push(`/groups/${group.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to create group');
      }
    } finally {
      setIsSubmitting(false);
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

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create group</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new group for organizing members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateGroupForm
            isSuperAdmin={user?.role === 'SUPER_ADMIN'}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/groups')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
