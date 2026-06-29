'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Users, Plus, CheckCircle2, XCircle } from 'lucide-react';
import {
  instructorCreateRequestSchema,
  instructorUpdateRequestSchema,
  type InstructorCreateRequest,
  type InstructorUpdateRequest,
  type InstructorResponse,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// ── Edit instructor dialog ───────────────────────────────────────────────────

export function EditInstructorDialog({
  instructor,
  open,
  onClose,
}: {
  instructor: InstructorResponse | null;
  open: boolean;
  onClose: () => void;
}) {
  const { update } = useInstructor(instructor?.id ?? '', { enabled: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstructorUpdateRequest>({
    resolver: zodResolver(instructorUpdateRequestSchema),
    mode: 'onTouched',
    values: instructor
      ? {
          name: instructor.name,
          email: instructor.email ?? '',
          specialization: instructor.specialization ?? '',
        }
      : undefined,
  });

  async function onSubmit(data: InstructorUpdateRequest) {
    if (!instructor) return;
    setIsSubmitting(true);
    try {
      await update(data);
      toast.success('Instructor updated successfully');
      reset();
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to update instructor';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  const handleToggleStatus = async () => {
    if (!instructor) return;
    setIsTogglingStatus(true);
    try {
      await update({ isActive: !instructor.isActive });
      toast.success(
        instructor.isActive
          ? 'Instructor deactivated'
          : 'Instructor reactivated',
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'Failed to update instructor status',
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && !!instructor}
        onOpenChange={(v) => !v && handleClose()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Instructor</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <form
            id="edit-instructor-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-instructor-name">
                Name <span className="text-error">*</span>
              </Label>
              <Input
                id="edit-instructor-name"
                placeholder="e.g. Alice Trainer"
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? 'edit-instructor-name-error' : undefined
                }
                {...register('name')}
              />
              {errors.name && (
                <p
                  id="edit-instructor-name-error"
                  className="text-xs text-error"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-instructor-email">Email (optional)</Label>
              <Input
                id="edit-instructor-email"
                type="email"
                placeholder="alice@gym.com"
                aria-invalid={!!errors.email}
                aria-describedby={
                  errors.email ? 'edit-instructor-email-error' : undefined
                }
                {...register('email')}
              />
              {errors.email && (
                <p
                  id="edit-instructor-email-error"
                  className="text-xs text-error"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Specialization */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-instructor-specialization">
                Specialization (optional)
              </Label>
              <Input
                id="edit-instructor-specialization"
                placeholder="e.g. Yoga, CrossFit, HIIT"
                aria-invalid={!!errors.specialization}
                aria-describedby={
                  errors.specialization
                    ? 'edit-instructor-specialization-error'
                    : undefined
                }
                {...register('specialization')}
              />
              {errors.specialization && (
                <p
                  id="edit-instructor-specialization-error"
                  className="text-xs text-error"
                >
                  {errors.specialization.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 mt-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Status</p>
                <p className="text-xs text-gray-500">
                  {instructor?.isActive
                    ? 'Active and available for new sessions.'
                    : 'Inactive and hidden from scheduling.'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTogglingStatus}
                onClick={() => setShowConfirmDialog(true)}
                className={
                  instructor?.isActive
                    ? 'border-error text-error hover:bg-red-50'
                    : 'border-primary-base text-primary-base hover:bg-primary-100'
                }
              >
                {isTogglingStatus
                  ? 'Updating...'
                  : instructor?.isActive
                    ? 'Deactivate'
                    : 'Reactivate'}
              </Button>
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
              form="edit-instructor-form"
              disabled={isSubmitting}
              className="bg-primary-base hover:bg-primary-400 text-white"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {instructor?.isActive
                ? 'Deactivate Instructor'
                : 'Reactivate Instructor'}
            </DialogTitle>
            <DialogDescription>
              {instructor?.isActive
                ? `Are you sure you want to deactivate ${instructor?.name}? They will not be able to be assigned to new sessions.`
                : `Are you sure you want to reactivate ${instructor?.name}? They will be available for new sessions.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isTogglingStatus}
            >
              Cancel
            </Button>
            <Button
              className={
                instructor?.isActive
                  ? 'bg-error hover:bg-error/90 text-white'
                  : 'bg-primary-base hover:bg-primary-400 text-white'
              }
              onClick={async () => {
                setShowConfirmDialog(false);
                await handleToggleStatus();
              }}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus
                ? instructor?.isActive
                  ? 'Deactivating...'
                  : 'Reactivating...'
                : instructor?.isActive
                  ? 'Deactivate'
                  : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE';

export default function InstructorsPage() {
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingInstructor, setEditingInstructor] =
    useState<InstructorResponse | null>(null);

  const { instructors, total, isLoading, error, mutate } = useInstructors({
    page,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'ACTIVE',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your gym instructors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            id="open-add-instructor-dialog"
            onClick={() => setShowAddDialog(true)}
            className="gap-2 bg-primary-base hover:bg-primary-400 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Instructor
          </Button>
        </div>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Instructors
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((instructor) => (
                  <TableRow
                    key={instructor.id}
                    id={`instructor-row-${instructor.id}`}
                    className="cursor-pointer"
                    onClick={() => setEditingInstructor(instructor)}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {/* Pagination */}
          {!isLoading && !error && total !== undefined && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * INSTRUCTORS_PAGE_SIZE + 1}–
                {Math.min(page * INSTRUCTORS_PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  id="instructors-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  id="instructors-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <AddInstructorDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />

      {/* Edit dialog */}
      <EditInstructorDialog
        instructor={editingInstructor}
        open={!!editingInstructor}
        onClose={() => setEditingInstructor(null)}
      />
    </div>
  );
}
