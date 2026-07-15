'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  opportunityTypeSchema,
  opportunityStatusSchema,
  type OpportunityResponse,
} from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useDepartments } from '@/hooks/use-departments';
import { useOpportunityMutations } from '@/hooks/use-opportunities';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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

const TYPE_LABELS = {
  ROLE: 'Role',
  PROJECT: 'Project',
  ROTATION: 'Rotation',
} as const;

const STATUS_LABELS = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  FILLED: 'Filled',
} as const;

// Local form schema (not the contract's create/update schemas directly) -
// keeps `deadline` a plain yyyy-mm-dd string to match the native date input;
// it's converted to a Date when building the API payload in onSubmit.
const opportunityFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  type: opportunityTypeSchema,
  description: z.string().max(5000).optional(),
  departmentId: z.string().uuid().optional(),
  status: opportunityStatusSchema.optional(),
  deadline: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface OpportunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: OpportunityResponse;
}

function toDateInputValue(deadline: OpportunityResponse['deadline']): string {
  if (!deadline) return '';
  return new Date(deadline).toISOString().slice(0, 10);
}

export function OpportunityFormDialog({
  open,
  onOpenChange,
  opportunity,
}: OpportunityFormDialogProps) {
  const isEdit = !!opportunity;
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const { departments } = useDepartments({ enabled: open });
  const { createOpportunity, updateOpportunity } = useOpportunityMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const managedDepartments = (departments ?? []).filter(
    (department) => department.manager?.id === user?.id,
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
  });

  useEffect(() => {
    if (!open) return;

    reset({
      title: opportunity?.title ?? '',
      type: opportunity?.type ?? 'ROLE',
      description: opportunity?.description ?? '',
      departmentId:
        opportunity?.department?.id ?? managedDepartments[0]?.id ?? undefined,
      status: opportunity?.status ?? 'OPEN',
      deadline: toDateInputValue(opportunity?.deadline ?? null),
    });
    // Re-run once managed departments finish loading so create mode can
    // default to the (usually only) department this manager heads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opportunity, managedDepartments.length]);

  const onSubmit = async (values: OpportunityFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: values.title,
        type: values.type,
        description: values.description,
        departmentId: values.departmentId,
        status: values.status,
        deadline: values.deadline ? new Date(values.deadline) : undefined,
      };

      if (isEdit && opportunity) {
        // requiredSkills is intentionally omitted here - update() treats a
        // provided array as "replace all skills", which this form doesn't manage.
        await updateOpportunity(opportunity.id, payload);
        toast.success('Opening updated');
      } else {
        await createOpportunity({ ...payload, requiredSkills: [] });
        toast.success('Opening created');
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Opening' : 'Create New Opening'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Senior Frontend Engineer"
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-error">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="departmentId"
                      className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                    >
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {managedDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.departmentId && (
                <p className="text-sm text-error">
                  {errors.departmentId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="type"
                      className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Describe the opportunity..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-gray-500 focus-visible:border-success focus-visible:ring-[3px] focus-visible:ring-success/20"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-error">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="status"
                      className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                  <Input
                    id="deadline"
                    type="date"
                    className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary-base hover:bg-primary-base/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Opening'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
