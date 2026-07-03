'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  announcementCreateRequestSchema,
  type AnnouncementAudience,
  type AnnouncementCreateRequest,
  type AnnouncementScope,
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
import {
  Calendar,
  Eye,
  Globe,
  LockKeyhole,
  Megaphone,
  ShieldX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const scopeIcons: Record<AnnouncementScope, LucideIcon> = {
  SITE: Megaphone,
  ORG: Globe,
  EVENT: Calendar,
};

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
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementCreateRequest>({
    resolver: zodResolver(announcementCreateRequestSchema),
    defaultValues: {
      title: '',
      bodyHtml: '',
      scope: 'EVENT',
      audience: 'EVENT_ATTENDEES',
      eventId: undefined,
    },
  });
  const scope = watch('scope');
  const bodyHtml = watch('bodyHtml');
  const eventId = watch('eventId');
  const audience = watch('audience') ?? 'EVENT_ATTENDEES';

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
      setValue('scope', fallbackScope, { shouldValidate: true });
      setValue('eventId', undefined, { shouldValidate: true });
      setValue(
        'audience',
        fallbackScope === 'EVENT' ? 'EVENT_ATTENDEES' : undefined,
        { shouldValidate: true },
      );
    }
  }, [scope, scopeOptions, setValue]);

  const onSubmit = async (data: AnnouncementCreateRequest) => {
    try {
      await create({
        title: data.title,
        bodyHtml: data.bodyHtml,
        scope: data.scope,
        ...(data.scope === 'EVENT'
          ? { audience: data.audience, eventId: data.eventId }
          : {}),
      });
      toast.success('Announcement posted');
      reset({
        title: '',
        bodyHtml: '',
        scope: data.scope,
        audience: data.scope === 'EVENT' ? data.audience : undefined,
        eventId: data.scope === 'EVENT' ? data.eventId : undefined,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to post announcement');
      }
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="announcement-title">Title</Label>
                  <Input
                    id="announcement-title"
                    maxLength={140}
                    aria-invalid={!!errors.title}
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="text-sm text-error">{errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select
                    value={scope}
                    onValueChange={(value) => {
                      const nextScope = value as AnnouncementScope;
                      setValue('scope', value as AnnouncementScope, {
                        shouldValidate: true,
                      });
                      setValue('eventId', undefined, { shouldValidate: true });
                      setValue(
                        'audience',
                        nextScope === 'EVENT' ? 'EVENT_ATTENDEES' : undefined,
                        { shouldValidate: true },
                      );
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            {(() => {
                              const Icon = scopeIcons[option.value];
                              return <Icon className="h-4 w-4" />;
                            })()}
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.scope && (
                    <p className="text-sm text-error">{errors.scope.message}</p>
                  )}
                </div>
              </div>

              {scope === 'EVENT' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Event</Label>
                    <Select
                      value={eventId}
                      onValueChange={(value) =>
                        setValue('eventId', value, { shouldValidate: true })
                      }
                    >
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
                    {errors.eventId && (
                      <p className="text-sm text-error">
                        {errors.eventId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select
                      value={audience}
                      onValueChange={(value) =>
                        setValue('audience', value as AnnouncementAudience, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EVENT_ATTENDEES">
                          <span className="flex items-center gap-2">
                            <LockKeyhole className="h-4 w-4" />
                            Event attendees
                          </span>
                        </SelectItem>
                        <SelectItem value="WHOLE_ORG">
                          <span className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Whole organization
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.audience && (
                      <p className="text-sm text-error">
                        {errors.audience.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Message</Label>
                <RichTextEditor
                  value={bodyHtml}
                  onChange={(value) =>
                    setValue('bodyHtml', value, { shouldValidate: true })
                  }
                />
                {errors.bodyHtml && (
                  <p className="text-sm text-error">
                    {errors.bodyHtml.message}
                  </p>
                )}
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
