'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  type Announcement,
  announcementCreateRequestSchema,
  announcementUpdateRequestSchema,
  type AnnouncementAudience,
  type AnnouncementCreateRequest,
  type AnnouncementScope,
  type AnnouncementUpdateRequest,
} from '@repo/contracts';
import { AnnouncementList } from '@/components/announcement-list';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Check,
  ChevronDown,
  Eye,
  Globe,
  LockKeyhole,
  Megaphone,
  Search,
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

function hasBodyContent(bodyHtml: string | undefined) {
  return (
    (bodyHtml ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
  );
}

export default function AnnouncementsPage() {
  const { user, isLoading: userLoading } = useUser();
  const canAccess = canAccessAnnouncements(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOrgAdmin = user?.role === 'ORG_ADMIN';
  const isPresenter =
    user?.role === 'MEMBER' && user?.memberRole === 'PRESENTER';
  const canCreate = isSuperAdmin || isOrgAdmin || isPresenter;
  const [eventSearch, setEventSearch] = useState('');
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const eventComboboxRef = useRef<HTMLDivElement>(null);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const title = watch('title');
  const bodyHtml = watch('bodyHtml');
  const eventId = watch('eventId');
  const audience = watch('audience') ?? 'EVENT_ATTENDEES';
  const isFormIncomplete =
    !title?.trim() ||
    !scope ||
    !hasBodyContent(bodyHtml) ||
    (scope === 'EVENT' && (!audience || !eventId));
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    watch: watchEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<AnnouncementUpdateRequest>({
    resolver: zodResolver(announcementUpdateRequestSchema),
    defaultValues: {
      title: '',
      bodyHtml: '',
    },
  });
  const editTitle = watchEdit('title');
  const editBodyHtml = watchEdit('bodyHtml');
  const isEditIncomplete = !editTitle?.trim() || !hasBodyContent(editBodyHtml);

  const {
    announcements,
    total,
    isLoading: announcementsLoading,
    error,
    create,
    update,
    remove,
  } = useAnnouncements({ enabled: canAccess });
  const { events, isLoading: eventsLoading } = useEvents({
    enabled: canCreate && scope === 'EVENT',
    upcoming: true,
    ...(isPresenter ? { hostedByMe: true } : {}),
  });
  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    if (!query) {
      return events;
    }
    return events?.filter((event) =>
      event.eventName.toLowerCase().includes(query),
    );
  }, [eventSearch, events]);
  const selectedEvent = useMemo(
    () => events?.find((event) => event.id === eventId),
    [eventId, events],
  );

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
      setEventSearch('');
      setEventDropdownOpen(false);
    }
  }, [scope, scopeOptions, setValue]);

  useEffect(() => {
    if (!eventDropdownOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (eventComboboxRef.current?.contains(event.target as Node)) {
        return;
      }
      setEventDropdownOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEventDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [eventDropdownOpen]);

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
      setEventSearch('');
      setEventDropdownOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to post announcement');
      }
    }
  };

  const canManageAnnouncement = (announcement: Announcement) => {
    if (!user) {
      return false;
    }

    if (user.role === 'SUPER_ADMIN') {
      return announcement.scope === 'SITE';
    }

    if (user.role === 'ORG_ADMIN') {
      return (
        (announcement.scope === 'ORG' || announcement.scope === 'EVENT') &&
        announcement.organizationId === user.organizationId
      );
    }

    return (
      user.role === 'MEMBER' &&
      user.memberRole === 'PRESENTER' &&
      announcement.scope === 'EVENT' &&
      announcement.authorId === user.id
    );
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    resetEdit({
      title: announcement.title,
      bodyHtml: announcement.bodyHtml,
    });
  };

  const onUpdate = async (data: AnnouncementUpdateRequest) => {
    if (!editingAnnouncement) {
      return;
    }

    try {
      await update(editingAnnouncement.id, data);
      toast.success('Announcement updated');
      setEditingAnnouncement(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to update announcement');
      }
    }
  };

  const onDelete = async (announcement: Announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"?`)) {
      return;
    }

    setDeletingId(announcement.id);
    try {
      await remove(announcement.id);
      toast.success('Announcement deleted');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to delete announcement');
      }
    } finally {
      setDeletingId(null);
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
                      setEventSearch('');
                      setEventDropdownOpen(false);
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
                    <div ref={eventComboboxRef} className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={eventDropdownOpen}
                        aria-controls="announcement-event-options"
                        className="h-9 w-full justify-between border-gray-300 bg-transparent px-3 text-left font-normal shadow-xs hover:bg-transparent"
                        onClick={() =>
                          setEventDropdownOpen((isOpen) => !isOpen)
                        }
                      >
                        <span
                          className={
                            selectedEvent
                              ? 'truncate text-gray-900'
                              : 'truncate text-gray-500'
                          }
                        >
                          {eventsLoading
                            ? 'Loading events...'
                            : selectedEvent?.eventName || 'Select event'}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>

                      {eventDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
                          <div className="border-b border-gray-200 p-2">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <Input
                                value={eventSearch}
                                onChange={(event) =>
                                  setEventSearch(event.target.value)
                                }
                                placeholder="Search events"
                                className="h-9 rounded-md py-2 pl-9 pr-3"
                              />
                            </div>
                          </div>
                          <div
                            id="announcement-event-options"
                            role="listbox"
                            className="max-h-64 overflow-y-auto p-1"
                          >
                            {eventsLoading && (
                              <div className="px-2 py-1.5 text-sm text-gray-500">
                                Loading events...
                              </div>
                            )}
                            {filteredEvents?.map((event) => (
                              <button
                                key={event.id}
                                type="button"
                                role="option"
                                aria-selected={event.id === eventId}
                                className={
                                  event.id === eventId
                                    ? 'flex w-full items-center justify-between gap-2 rounded-sm bg-primary-100 px-2 py-1.5 text-left text-sm text-gray-900 outline-none'
                                    : 'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-gray-900 outline-none hover:bg-gray-100 focus:bg-gray-100'
                                }
                                onClick={() => {
                                  setValue('eventId', event.id, {
                                    shouldValidate: true,
                                  });
                                  setEventDropdownOpen(false);
                                  setEventSearch('');
                                }}
                              >
                                <span className="truncate">
                                  {event.eventName}
                                </span>
                                {event.id === eventId && (
                                  <Check className="h-4 w-4 text-primary-base" />
                                )}
                              </button>
                            ))}
                            {!eventsLoading && filteredEvents?.length === 0 && (
                              <div className="px-2 py-1.5 text-sm text-gray-500">
                                No events found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
                disabled={isSubmitting || isFormIncomplete}
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
          canManage={canManageAnnouncement}
          onEdit={openEditDialog}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      </div>

      <Dialog
        open={!!editingAnnouncement}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAnnouncement(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
            <DialogDescription>
              Update the title and message for this announcement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-announcement-title">Title</Label>
              <Input
                id="edit-announcement-title"
                maxLength={140}
                aria-invalid={!!editErrors.title}
                {...registerEdit('title')}
              />
              {editErrors.title && (
                <p className="text-sm text-error">{editErrors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <RichTextEditor
                value={editBodyHtml}
                onChange={(value) =>
                  setEditValue('bodyHtml', value, { shouldValidate: true })
                }
              />
              {editErrors.bodyHtml && (
                <p className="text-sm text-error">
                  {editErrors.bodyHtml.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAnnouncement(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || isEditIncomplete}
                className="bg-primary-base hover:bg-primary-base/90"
              >
                {isUpdating ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
