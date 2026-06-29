'use client';

import { useState } from 'react';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarDays, Plus, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { sessionCreateRequestSchema } from '@repo/contracts';
import Link from 'next/link';

const formSchema = sessionCreateRequestSchema
  .omit({ startsAt: true, endsAt: true })
  .extend({
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
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
        return true; // Let the individual field validation catch invalid dates
      }
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    },
  );

type FormValues = z.infer<typeof formSchema>;
import { useSessions, useCreateSession } from '@/hooks/use-sessions';
import { useAvailableInstructors } from '@/hooks/use-instructors';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

function AddSessionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { create } = useCreateSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      capacity: 20,
      instructorId: 'unassigned',
    },
  });

  const dateVal = form.watch('date');
  const startTimeVal = form.watch('startTime');
  const endTimeVal = form.watch('endTime');

  // Combine date and time to ISO string
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

  async function onSubmit(data: FormValues) {
    const startIso = getIsoString(data.date, data.startTime);
    const endIso = getIsoString(data.date, data.endTime);

    if (!startIso || !endIso) {
      toast.error('Invalid date/time combination');
      return;
    }

    setIsSubmitting(true);
    try {
      await create({
        title: data.title,
        description: data.description,
        startsAt: startIso,
        endsAt: endIso,
        capacity: data.capacity,
        instructorId:
          data.instructorId === 'unassigned' ? undefined : data.instructorId,
      });
      toast.success('Session added successfully');
      form.reset();
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to add session';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Session</DialogTitle>
          <DialogDescription>
            Schedule a new class or session for your gym.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-session-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="session-title">
              Title <span className="text-error">*</span>
            </Label>
            <Input
              id="session-title"
              placeholder="e.g. Morning Yoga"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-error">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-description">Description (optional)</Label>
            <Input
              id="session-description"
              placeholder="A brief description of the class"
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-error">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-date">
              Date <span className="text-error">*</span>
            </Label>
            <Input id="session-date" type="date" {...form.register('date')} />
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
              {form.formState.errors.startTime && (
                <p className="text-xs text-error">
                  {form.formState.errors.startTime.message}
                </p>
              )}
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
              placeholder="20"
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
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.instructorId && (
              <p className="text-xs text-error">
                {form.formState.errors.instructorId.message}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Only active instructors without overlapping classes are shown.
            </p>
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
            form="add-session-form"
            disabled={isSubmitting}
            className="bg-primary-base hover:bg-primary-400 text-white"
          >
            {isSubmitting ? 'Adding…' : 'Add Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SessionsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);

  // We could add state for startDate and endDate filtering
  const { sessions, isLoading, error, mutate } = useSessions({});

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-error">Failed to load sessions.</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  // Group sessions by day
  const groupedSessions = sessions?.reduce(
    (acc, session) => {
      const day = format(new Date(session.startsAt), 'yyyy-MM-dd');
      if (!acc[day]) acc[day] = [];
      acc[day].push(session);
      return acc;
    },
    {} as Record<string, typeof sessions>,
  );

  const sortedDays = Object.keys(groupedSessions || {}).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your gym&apos;s classes and sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="gap-2 bg-primary-base hover:bg-primary-400 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Session
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <CalendarDays className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No sessions scheduled.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              Schedule your first session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedDays.map((day) => (
            <div key={day} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                {format(new Date(day), 'EEEE, MMMM d, yyyy')}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedSessions![day]!.map((session) => (
                  <Link
                    href={`/sessions/${session.id}`}
                    key={session.id}
                    className="block outline-none focus-visible:ring-2 focus-visible:ring-primary-base rounded-xl"
                  >
                    <Card
                      className={`h-full cursor-pointer hover:border-primary-base transition-colors ${session.status === 'CANCELLED' ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base truncate pr-2">
                            {session.title}
                          </CardTitle>
                          {session.status === 'CANCELLED' && (
                            <span className="text-xs font-semibold text-error bg-error-light px-2 py-0.5 rounded-full">
                              Cancelled
                            </span>
                          )}
                          {session.status === 'COMPLETED' && (
                            <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="mr-2 h-4 w-4 shrink-0" />
                          {format(new Date(session.startsAt), 'h:mm a')} -{' '}
                          {format(new Date(session.endsAt), 'h:mm a')}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="mr-2 h-4 w-4 shrink-0" />
                          {session._count?.bookings ?? 0} / {session.capacity}{' '}
                          booked
                        </div>
                        <div className="text-sm text-gray-500 mt-2 truncate">
                          {session.instructor
                            ? `Instructor: ${session.instructor.name}`
                            : 'No instructor assigned'}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddSessionDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  );
}
