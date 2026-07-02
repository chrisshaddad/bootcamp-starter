'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  AnnouncementAudience,
  AnnouncementCreateRequest,
  AnnouncementScope,
} from '@repo/contracts';
import { AnnouncementList } from '@/components/announcement-list';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnnouncements } from '@/hooks/use-announcements';
import { useEvents } from '@/hooks/use-events';
import { useUser } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Megaphone, ShieldX } from 'lucide-react';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to access this page.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

function canAccessAnnouncements(role: string | undefined) {
  return role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'MEMBER';
}

export default function AnnouncementsPage() {
  const { user, isLoading: userLoading } = useUser();
  const canAccess = canAccessAnnouncements(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOrgAdmin = user?.role === 'ORG_ADMIN';
  const isPresenter =
    user?.role === 'MEMBER' && user?.memberRole === 'PRESENTER';
  const canCreate = isSuperAdmin || isOrgAdmin || isPresenter;
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [scope, setScope] = useState<AnnouncementScope>(
    isSuperAdmin ? 'SITE' : isOrgAdmin ? 'ORG' : 'EVENT',
  );
  const [audience, setAudience] =
    useState<AnnouncementAudience>('EVENT_ATTENDEES');
  const [eventId, setEventId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    announcements,
    total,
    isLoading: announcementsLoading,
    error,
    create,
  } = useAnnouncements({ enabled: canAccess });
  const { events, isLoading: eventsLoading } = useEvents({
    enabled: canCreate && scope === 'EVENT',
    upcoming: true,
  });

  const scopeOptions = useMemo(() => {
    const options: { value: AnnouncementScope; label: string }[] = [];
    if (isSuperAdmin) {
      options.push({ value: 'SITE', label: 'Site-wide' });
    }
    if (isOrgAdmin) {
      options.push({ value: 'ORG', label: 'Org-wide' });
      options.push({ value: 'EVENT', label: 'Event-related' });
    }
    if (isPresenter) {
      options.push({ value: 'EVENT', label: 'Event-related' });
    }
    return options;
  }, [isOrgAdmin, isPresenter, isSuperAdmin]);

  useEffect(() => {
    const fallbackScope = scopeOptions[0]?.value;
    if (
      fallbackScope &&
      !scopeOptions.some((option) => option.value === scope)
    ) {
      setScope(fallbackScope);
      setEventId('');
    }
  }, [scope, scopeOptions]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload: AnnouncementCreateRequest = {
      title,
      bodyHtml,
      scope,
      ...(scope === 'EVENT' ? { audience, eventId } : {}),
    };

    try {
      await create(payload);
      toast.success('Announcement posted');
      setTitle('');
      setBodyHtml('');
      setEventId('');
      setAudience('EVENT_ATTENDEES');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to post announcement');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Megaphone className="h-6 w-6" />
          Announcements
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Updates for the platform, your organization, and events.
        </p>
      </div>

      {canCreate && (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              New announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="announcement-title">Title</Label>
                  <Input
                    id="announcement-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={140}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select
                    value={scope}
                    onValueChange={(value) => {
                      setScope(value as AnnouncementScope);
                      setEventId('');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {scope === 'EVENT' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Event</Label>
                    <Select value={eventId} onValueChange={setEventId}>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            eventsLoading ? 'Loading events...' : 'Select event'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {events?.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.eventName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select
                      value={audience}
                      onValueChange={(value) =>
                        setAudience(value as AnnouncementAudience)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EVENT_ATTENDEES">
                          Event attendees
                        </SelectItem>
                        <SelectItem value="WHOLE_ORG">
                          Whole organization
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Message</Label>
                <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || (scope === 'EVENT' && !eventId)}
                className="bg-primary-base hover:bg-primary-base/90"
              >
                {isSubmitting ? 'Posting...' : 'Post announcement'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        {total !== undefined && (
          <p className="mb-3 text-sm text-gray-500">{total} total</p>
        )}
        <AnnouncementList
          announcements={announcements}
          isLoading={announcementsLoading}
          error={error}
        />
      </div>
    </div>
  );
}
