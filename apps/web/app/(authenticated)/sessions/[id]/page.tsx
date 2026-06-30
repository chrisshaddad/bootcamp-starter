'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Users,
  User,
  XCircle,
} from 'lucide-react';
import { useSession } from '@/hooks/use-sessions';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAvailableInstructors } from '@/hooks/use-instructors';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import type { SessionResponse } from '@repo/contracts';
import { sessionUpdateRequestSchema } from '@repo/contracts';

/** Today's date in yyyy-MM-dd format — the minimum allowed date when editing a session */
const MIN_DATE = format(new Date(), 'yyyy-MM-dd');

/**
 * Renders a labeled info row with an icon, used in the session detail card.
 */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

/**
 * Local form schema for editing a session.
 * Splits startsAt/endsAt into separate date + time pickers.
 */
const formSchema = sessionUpdateRequestSchema
  .omit({ startsAt: true, endsAt: true })
  .extend({
    date: z
      .string()
      .min(1, 'Date is required')
      .refine((d) => d >= MIN_DATE, {
        message: 'Sessions cannot be scheduled in the past',
      }),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    capacity: z.number().int().positive('Capacity must be positive'),
    instructorId: z.string().optional(),
  })
  .refine(
    (data) => {
      try {
        const start = new Date(`${data.date}T${data.startTime}`);
        const end = new Date(`${data.date}T${data.endTime}`);
        return end > start;
      } catch {
        return true;
      }
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    },
  )
  .refine(
    (data) => {
      try {
        const start = new Date(`${data.date}T${data.startTime}`);
        // 5-minute grace period
        const nowWithGrace = new Date(Date.now() - 5 * 60 * 1000);
        return start >= nowWithGrace;
      } catch {
        return true;
      }
    },
    {
      message: 'Start time cannot be in the past',
      path: ['startTime'],
    },
  );

type FormValues = z.infer<typeof formSchema>;

/**
 * Dialog for editing an existing session's details.
 * The dialog is disabled (not rendered) when the session is in the past.
 */
function EditSessionDialog({
  session,
  open,
  onClose,
  onUpdate,
}: {
  session: SessionResponse;
  open: boolean;
  onClose: () => void;
  onUpdate: (
    data: import('@repo/contracts').SessionUpdateRequest,
  ) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    values: {
      title: session.title,
      description: session.description ?? '',
      date: format(new Date(session.startsAt), 'yyyy-MM-dd'),
      startTime: format(new Date(session.startsAt), 'HH:mm'),
      endTime: format(new Date(session.endsAt), 'HH:mm'),
      capacity: session.capacity,
      instructorId: session.instructorId ?? 'unassigned',
    },
  });

  const dateVal = form.watch('date');
  const startTimeVal = form.watch('startTime');
  const endTimeVal = form.watch('endTime');
  const descriptionVal = form.watch('description') ?? '';

  /** Combine a date string and a time string into an ISO datetime string */
  const getIsoString = (d: string, t: string) => {
    if (!d || !t) return null;
    try {
      const dateObj = new Date(`${d}T${t}`);
      if (isNaN(dateObj.getTime())) return null;
      return dateObj.toISOString();
    } catch {
      return null;
    }
  };

  const startsAtIso = getIsoString(dateVal, startTimeVal);
  const endsAtIso = getIsoString(dateVal, endTimeVal);

  const { availableInstructors, isLoading: loadingInstructors } =
    useAvailableInstructors(startsAtIso, endsAtIso);

  /** Handle form submission — build ISO timestamps and invoke the update callback */
  async function onSubmit(data: FormValues) {
    const startIso = getIsoString(data.date, data.startTime);
    const endIso = getIsoString(data.date, data.endTime);

    if (!startIso || !endIso) {
      toast.error('Invalid date/time combination');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate({
        title: data.title,
        description: data.description,
        startsAt: startIso,
        endsAt: endIso,
        capacity: data.capacity,
        instructorId:
          data.instructorId === 'unassigned' ? null : data.instructorId,
      });
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to update session';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Reset form state and close the dialog */
  function handleClose() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <DialogDescription>
            Update details or reassign the instructor.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-session-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="session-title">
              Title <span className="text-error">*</span>
            </Label>
            <Input id="session-title" {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-xs text-error">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-description">Description (optional)</Label>
            <Textarea
              id="session-description"
              rows={3}
              maxLength={500}
              {...form.register('description')}
            />
            <div className="flex justify-between items-center">
              {form.formState.errors.description ? (
                <p className="text-xs text-error">
                  {form.formState.errors.description.message}
                </p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400 ml-auto">
                {descriptionVal.length}/500
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-date">
              Date <span className="text-error">*</span>
            </Label>
            <Input
              id="session-date"
              type="date"
              min={MIN_DATE}
              {...form.register('date')}
            />
            {form.formState.errors.date && (
              <p className="text-xs text-error">
                {form.formState.errors.date.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="session-start">
                Start Time <span className="text-error">*</span>
              </Label>
              <Input
                id="session-start"
                type="time"
                {...form.register('startTime')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-end">
                End Time <span className="text-error">*</span>
              </Label>
              <Input
                id="session-end"
                type="time"
                {...form.register('endTime')}
              />
              {form.formState.errors.endTime && (
                <p className="text-xs text-error">
                  {form.formState.errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-capacity">
              Capacity <span className="text-error">*</span>
            </Label>
            <Input
              id="session-capacity"
              type="number"
              {...form.register('capacity', { valueAsNumber: true })}
            />
            {form.formState.errors.capacity && (
              <p className="text-xs text-error">
                {form.formState.errors.capacity.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Instructor (optional)</Label>
            <Controller
              control={form.control}
              name="instructorId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!startsAtIso || !endsAtIso}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !startsAtIso || !endsAtIso
                          ? 'Select times first'
                          : loadingInstructors
                            ? 'Loading available...'
                            : 'Select instructor'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {availableInstructors?.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                    {session.instructor &&
                      !availableInstructors?.find(
                        (i) => i.id === session.instructor!.id,
                      ) && (
                        <SelectItem
                          key={session.instructor.id}
                          value={session.instructor.id}
                        >
                          {session.instructor.name} (Current)
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-session-form"
            disabled={isSubmitting}
            className="bg-primary-base hover:bg-primary-400 text-white"
          >
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Main detail page for viewing and managing a single gym session */
export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { session, isLoading, error, update, cancel } = useSession(sessionId);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="h-64" />
        </Card>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="py-10 text-center">
        <div className="mb-4 text-error">Failed to load session</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isCancelled = session.status === 'CANCELLED';
  const isCompleted = session.status === 'COMPLETED';
  const isPast = new Date(session.startsAt) < new Date();
  const bookedCount = session._count?.bookings ?? 0;
  const capacityPct = Math.min(
    100,
    Math.round((bookedCount / session.capacity) * 100),
  );

  /** Confirm and cancel the session via the API */
  const handleCancelSession = async () => {
    setIsCancelling(true);
    try {
      await cancel();
      toast.success('Session cancelled');
      setShowCancelDialog(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to cancel session',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/sessions')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Schedule
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${
                isCancelled
                  ? 'bg-error-light text-error border-error-light'
                  : isCompleted
                    ? 'bg-gray-200 text-gray-700 border-gray-300'
                    : 'bg-primary-100 text-primary-base border-primary-200'
              }`}
            >
              {session.status}
            </span>
            {isPast && !isCancelled && !isCompleted && (
              <span className="text-xs text-gray-400 italic">Past session</span>
            )}
            {session.description && (
              <span className="text-sm text-gray-500 ml-2">
                {session.description}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {/* Edit and cancel actions are only available for active, future sessions */}
          {!isCancelled && !isCompleted && !isPast && (
            <>
              <Button
                variant="outline"
                className="gap-2 text-gray-700"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4" /> Edit Session
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-error/30 text-error hover:bg-error-light"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-4 w-4" /> Cancel Session
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5" />
              Session Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow
              icon={CalendarDays}
              label="Date"
              value={format(new Date(session.startsAt), 'EEEE, MMMM d, yyyy')}
            />
            <InfoRow
              icon={Clock}
              label="Time"
              value={`${format(new Date(session.startsAt), 'h:mm a')} – ${format(new Date(session.endsAt), 'h:mm a')}`}
            />
            <InfoRow
              icon={User}
              label="Instructor"
              value={
                session.instructor?.name || (
                  <span className="text-gray-400">Unassigned</span>
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Capacity &amp; Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1 font-medium">
                <span>{bookedCount} Booked</span>
                <span className="text-gray-500">
                  {session.capacity} Total Slots
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${capacityPct >= 100 ? 'bg-error' : capacityPct > 80 ? 'bg-amber-400' : 'bg-primary-base'}`}
                  style={{ width: `${capacityPct}%` }}
                ></div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-6">
              <div className="text-sm font-medium text-gray-700">
                Bookings feature coming soon!
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Member registration for this session will be available in Phase
                B2.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel &quot;{session.title}&quot;? This
              action cannot be undone. Booked members (if any) will need to be
              notified separately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
            >
              Keep Session
            </Button>
            <Button
              className="bg-error hover:bg-error/90 text-white"
              onClick={handleCancelSession}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {session && !isPast && (
        <EditSessionDialog
          session={session}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onUpdate={async (data) => {
            await update(data);
            toast.success('Session updated successfully');
          }}
        />
      )}
    </div>
  );
}
