'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Users, Plus, CheckCircle2, XCircle } from 'lucide-react';
import {
  instructorCreateRequestSchema,
  type InstructorCreateRequest,
} from '@repo/contracts';
import {
  useInstructors,
  useCreateInstructor,
  useInstructor,
  INSTRUCTORS_PAGE_SIZE,
} from '@/hooks/use-instructors';
import { ApiError } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

// ── Small helper components ─────────────────────────────────────────────────

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-primary-100 text-primary-base'
          : 'bg-gray-200 text-gray-700'
      }`}
    >
      {isActive ? (
        <>
          <CheckCircle2 className="h-3 w-3" /> Active
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3" /> Inactive
        </>
      )}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

// ── Deactivate toggle ────────────────────────────────────────────────────────

function DeactivateButton({ id, isActive }: { id: string; isActive: boolean }) {
  const { update } = useInstructor(id, { enabled: false });
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await update({ isActive: !isActive });
      toast.success(
        isActive ? 'Instructor deactivated' : 'Instructor reactivated',
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to update instructor';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="text-xs"
      id={`toggle-instructor-${id}`}
    >
      {isActive ? 'Deactivate' : 'Reactivate'}
    </Button>
  );
}

// ── Add instructor dialog ────────────────────────────────────────────────────

export function AddInstructorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { create } = useCreateInstructor();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstructorCreateRequest>({
    resolver: zodResolver(instructorCreateRequestSchema),
    mode: 'onTouched',
  });

  async function onSubmit(data: InstructorCreateRequest) {
    setIsSubmitting(true);
    try {
      await create(data);
      toast.success('Instructor added successfully');
      reset();
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to add instructor';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Instructor</DialogTitle>
          <DialogDescription>
            Add a new instructor or trainer to your gym.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-instructor-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="instructor-name">
              Name <span className="text-error">*</span>
            </Label>
            <Input
              id="instructor-name"
              placeholder="e.g. Alice Trainer"
              aria-invalid={!!errors.name}
              aria-describedby={
                errors.name ? 'instructor-name-error' : undefined
              }
              {...register('name')}
            />
            {errors.name && (
              <p id="instructor-name-error" className="text-xs text-error">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="instructor-email">Email (optional)</Label>
            <Input
              id="instructor-email"
              type="email"
              placeholder="alice@gym.com"
              aria-invalid={!!errors.email}
              aria-describedby={
                errors.email ? 'instructor-email-error' : undefined
              }
              {...register('email')}
            />
            {errors.email && (
              <p id="instructor-email-error" className="text-xs text-error">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Specialization */}
          <div className="space-y-1.5">
            <Label htmlFor="instructor-specialization">
              Specialization (optional)
            </Label>
            <Input
              id="instructor-specialization"
              placeholder="e.g. Yoga, CrossFit, HIIT"
              aria-invalid={!!errors.specialization}
              aria-describedby={
                errors.specialization
                  ? 'instructor-specialization-error'
                  : undefined
              }
              {...register('specialization')}
            />
            {errors.specialization && (
              <p
                id="instructor-specialization-error"
                className="text-xs text-error"
              >
                {errors.specialization.message}
              </p>
            )}
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
            form="add-instructor-form"
            disabled={isSubmitting}
            id="submit-add-instructor"
          >
            {isSubmitting ? 'Adding…' : 'Add Instructor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InstructorsPage() {
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { instructors, total, isLoading, error, mutate } = useInstructors({
    page,
  });
  const totalPages = Math.ceil((total ?? 0) / INSTRUCTORS_PAGE_SIZE);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-error">Failed to load instructors.</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100">
            <Users className="h-5 w-5 text-primary-base" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Instructors</h1>
            <p className="text-sm text-gray-500">
              {total !== undefined
                ? `${total} instructor${total === 1 ? '' : 's'}`
                : 'Loading…'}
            </p>
          </div>
        </div>
        <Button
          id="open-add-instructor-dialog"
          onClick={() => setShowAddDialog(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Instructor
        </Button>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            All Instructors
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : !instructors || instructors.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No instructors yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                id="empty-add-instructor"
              >
                Add your first instructor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((instructor) => (
                  <TableRow
                    key={instructor.id}
                    id={`instructor-row-${instructor.id}`}
                  >
                    <TableCell className="font-medium">
                      {instructor.name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {instructor.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {instructor.specialization ?? '—'}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge isActive={instructor.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeactivateButton
                        id={instructor.id}
                        isActive={instructor.isActive}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing{' '}
            {Math.min((page - 1) * INSTRUCTORS_PAGE_SIZE + 1, total ?? 0)}–
            {Math.min(page * INSTRUCTORS_PAGE_SIZE, total ?? 0)} of {total ?? 0}{' '}
            instructors
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              id="instructors-prev-page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              id="instructors-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add dialog */}
      <AddInstructorDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  );
}
