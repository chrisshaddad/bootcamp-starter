'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ShieldX } from 'lucide-react';
import type { GroupUpdateRequest } from '@repo/contracts';
import { EditGroupForm } from '@/components/group-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-auth';
import { useGroup } from '@/hooks/use-groups';
import { ApiError } from '@/lib/api';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to edit groups.
      </p>
    </div>
  );
}

export default function EditGroupPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';
  const { group, isLoading, update } = useGroup(id, { enabled: isAdmin });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (userLoading || isLoading) {
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

  if (!group) {
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

  const handleSubmit = async (data: GroupUpdateRequest) => {
    setIsSubmitting(true);
    try {
      await update(data);
      toast.success('Group updated');
      router.push(`/groups/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to update group');
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
        onClick={() => router.push(`/groups/${id}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to group
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit group</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update name and description
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditGroupForm
            defaultValues={{
              name: group.name,
              description: group.description,
            }}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/groups/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
