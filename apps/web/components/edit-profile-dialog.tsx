'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  employeeProfileUpdateRequestSchema,
  type EmployeeProfileUpdateRequest,
} from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bio: string | null;
  careerGoal: string | null;
  onSave: (data: EmployeeProfileUpdateRequest) => Promise<unknown>;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  bio,
  careerGoal,
  onSave,
}: EditProfileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeProfileUpdateRequest>({
    resolver: zodResolver(employeeProfileUpdateRequestSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({ bio: bio ?? '', careerGoal: careerGoal ?? '' });
  }, [open, bio, careerGoal, reset]);

  const onSubmit = async (values: EmployeeProfileUpdateRequest) => {
    setIsSubmitting(true);
    try {
      await onSave({
        bio: values.bio || null,
        careerGoal: values.careerGoal || null,
      });
      toast.success('Profile updated');
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
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={3}
              placeholder="A short summary about you..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-gray-500 focus-visible:border-success focus-visible:ring-[3px] focus-visible:ring-success/20"
              {...register('bio')}
            />
            {errors.bio && (
              <p className="text-sm text-error">{errors.bio.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="careerGoal">Career Goals</Label>
            <textarea
              id="careerGoal"
              rows={3}
              placeholder="Where do you want your career to go next?"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-gray-500 focus-visible:border-success focus-visible:ring-[3px] focus-visible:ring-success/20"
              {...register('careerGoal')}
            />
            {errors.careerGoal && (
              <p className="text-sm text-error">{errors.careerGoal.message}</p>
            )}
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
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
