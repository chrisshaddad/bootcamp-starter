'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { OrganizationDetailResponse } from '@repo/contracts';
import {
  useOrganizationMutations,
  useOrganization,
} from '@/hooks/use-organizations';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const organizationFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
  website: z.string().max(200).optional(),
  requiresManagerApproval: z.boolean(),
  adminName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  adminEmail: z.string().email('Enter a valid email'),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: OrganizationDetailResponse;
  onSuccess?: () => void;
}

export function OrganizationFormDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: OrganizationFormDialogProps) {
  const isEdit = !!organization;
  const { createOrganization } = useOrganizationMutations();
  const { update } = useOrganization(organization?.id ?? '', {
    enabled: isEdit,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
  });

  useEffect(() => {
    if (!open) return;

    reset({
      name: organization?.name ?? '',
      description: organization?.description ?? '',
      website: organization?.website ?? '',
      requiresManagerApproval: false,
      adminName: '',
      adminEmail: '',
    });
  }, [open, organization, reset]);

  const onSubmit = async (values: OrganizationFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEdit && organization) {
        await update({
          name: values.name,
          description: values.description,
          website: values.website,
        });
        toast.success('Organization updated');
      } else {
        await createOrganization({
          name: values.name,
          description: values.description,
          website: values.website,
          requiresManagerApproval: values.requiresManagerApproval,
          adminName: values.adminName,
          adminEmail: values.adminEmail,
        });
        toast.success('Organization created - an invite email was sent');
      }
      onOpenChange(false);
      onSuccess?.();
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
            {isEdit ? 'Edit Organization' : 'Create Organization'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              placeholder="e.g. Acme Corp"
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              placeholder="https://example.com"
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              {...register('website')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              placeholder="Describe the organization..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-gray-500 focus-visible:border-success focus-visible:ring-[3px] focus-visible:ring-success/20"
              {...register('description')}
            />
          </div>

          {!isEdit && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    placeholder="Jane Doe"
                    className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                    aria-invalid={!!errors.adminName}
                    {...register('adminName')}
                  />
                  {errors.adminName && (
                    <p className="text-sm text-error">
                      {errors.adminName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="jane@acme.com"
                    className="h-10 rounded-lg border-gray-200 bg-white text-sm"
                    aria-invalid={!!errors.adminEmail}
                    {...register('adminEmail')}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-error">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>
              </div>

              <Controller
                name="requiresManagerApproval"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                    Require manager approval for internal mobility applications
                    by default
                  </label>
                )}
              />
            </>
          )}

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
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
