'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  employmentTypeSchema,
  workArrangementSchema,
  type EmployeeProfileUpdateRequest,
  type EmployeeResponse,
} from '@repo/contracts';
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

const EMPLOYMENT_TYPE_LABELS = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
} as const;

const WORK_ARRANGEMENT_LABELS = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
} as const;

// Radix Select items can't use an empty string as their value, so a sentinel
// represents "no selection" - translated back to null on submit.
const NOT_SPECIFIED = '__not_specified__';

// Local form schema (not the contract's update schema directly) - lets the
// employment/work-arrangement selects hold the NOT_SPECIFIED sentinel, which
// is converted to null when building the API payload in onSubmit.
const profileFormSchema = z.object({
  bio: z.string().max(2000).optional(),
  careerGoal: z.string().max(2000).optional(),
  phoneNumber: z.string().max(50).optional(),
  street1: z.string().max(200).optional(),
  street2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  employmentType: z.union([employmentTypeSchema, z.literal(NOT_SPECIFIED)]),
  workArrangement: z.union([workArrangementSchema, z.literal(NOT_SPECIFIED)]),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EmployeeResponse['profile'];
  onSave: (data: EmployeeProfileUpdateRequest) => Promise<unknown>;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: EditProfileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      bio: profile?.bio ?? '',
      careerGoal: profile?.careerGoal ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
      street1: profile?.street1 ?? '',
      street2: profile?.street2 ?? '',
      city: profile?.city ?? '',
      state: profile?.state ?? '',
      postalCode: profile?.postalCode ?? '',
      country: profile?.country ?? '',
      employmentType: profile?.employmentType ?? NOT_SPECIFIED,
      workArrangement: profile?.workArrangement ?? NOT_SPECIFIED,
    });
  }, [open, profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave({
        bio: values.bio || null,
        careerGoal: values.careerGoal || null,
        phoneNumber: values.phoneNumber || null,
        street1: values.street1 || null,
        street2: values.street2 || null,
        city: values.city || null,
        state: values.state || null,
        postalCode: values.postalCode || null,
        country: values.country || null,
        employmentType:
          values.employmentType === NOT_SPECIFIED
            ? null
            : values.employmentType,
        workArrangement:
          values.workArrangement === NOT_SPECIFIED
            ? null
            : values.workArrangement,
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
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
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

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="+1 415 555 0100"
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              {...register('phoneNumber')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Controller
                name="employmentType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="employmentType"
                      className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NOT_SPECIFIED}>
                        Not specified
                      </SelectItem>
                      {Object.entries(EMPLOYMENT_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workArrangement">Work Arrangement</Label>
              <Controller
                name="workArrangement"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="workArrangement"
                      className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                    >
                      <SelectValue placeholder="Select arrangement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NOT_SPECIFIED}>
                        Not specified
                      </SelectItem>
                      {Object.entries(WORK_ARRANGEMENT_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street1">Address Line 1</Label>
            <Input
              id="street1"
              placeholder="Street address"
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              {...register('street1')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street2">Address Line 2 (optional)</Label>
            <Input
              id="street2"
              placeholder="Apartment, suite, etc."
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              {...register('street2')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                {...register('city')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                {...register('state')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                {...register('postalCode')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                {...register('country')}
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
