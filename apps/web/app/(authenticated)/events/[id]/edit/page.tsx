'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ShieldX } from 'lucide-react';
import type { EventUpdateRequest } from '@repo/contracts';
import { EditEventForm } from '@/components/event-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-auth';
import { useEvent } from '@/hooks/use-events';
import { ApiError } from '@/lib/api';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to edit events.
      </p>
    </div>
  );
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, isLoading: userLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  const {
    event,
    isLoading: eventLoading,
    error,
    update,
  } = useEvent(id, { enabled: isAdmin && !!id });

  if (userLoading || eventLoading) {
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

  if (error || !event) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2 text-gray-600"
          onClick={() => router.push('/events')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
        <div className="py-10 text-center text-error">
          Event not found or failed to load
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: EventUpdateRequest) => {
    setIsSubmitting(true);
    try {
      await update(data);
      toast.success('Event updated');
      router.push(`/events/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to update event');
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
        onClick={() => router.push(`/events/${id}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit event</h1>
        <p className="mt-1 text-sm text-gray-500">{event.eventName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditEventForm
            isSuperAdmin={user?.role === 'SUPER_ADMIN'}
            defaultValues={{
              eventName: event.eventName,
              startsAt: event.startsAt,
              presenterId: event.presenterId,
              organizationId: event.organizationId,
            }}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/events/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
