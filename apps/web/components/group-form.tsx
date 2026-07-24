'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  groupCreateRequestSchema,
  groupUpdateRequestSchema,
  type GroupCreateRequest,
  type GroupUpdateRequest,
} from '@repo/contracts';
import { useOrganizations } from '@/hooks/use-organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const createGroupFormSchema = groupCreateRequestSchema.extend({
  organizationId: z.uuid().optional(),
});
type CreateGroupFormValues = z.infer<typeof createGroupFormSchema>;

interface CreateGroupFormProps {
  isSuperAdmin: boolean;
  isSubmitting?: boolean;
  onSubmit: (
    data: GroupCreateRequest,
    organizationId?: string,
  ) => Promise<void>;
  onCancel: () => void;
}

/**
 * Form for creating a group, with an org picker for super admins.
 */
export function CreateGroupForm({
  isSuperAdmin,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: CreateGroupFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      name: '',
      description: '',
      organizationId: undefined,
    },
  });

  const organizationId = watch('organizationId');
  const { organizations, isLoading: orgsLoading } = useOrganizations({
    enabled: isSuperAdmin,
    status: 'ACTIVE',
  });

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (data) => {
        const { organizationId: selectedOrgId, ...body } = data;
        await onSubmit(
          {
            ...body,
            description: body.description?.trim() || null,
          },
          isSuperAdmin ? selectedOrgId : undefined,
        );
      })}
    >
      {isSuperAdmin && (
        <div className="space-y-2">
          <Label htmlFor="organizationId">Organization</Label>
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={orgsLoading}
              >
                <SelectTrigger id="organizationId">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {(organizations ?? []).map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.organizationId && (
            <p className="text-sm text-error">
              {errors.organizationId.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} placeholder="Leadership Team" />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={4}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          {...register('description')}
          placeholder="Optional description"
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || (isSuperAdmin && !organizationId)}
          className="bg-primary-base hover:bg-primary-base/90"
        >
          {isSubmitting ? 'Creating...' : 'Create group'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface EditGroupFormProps {
  defaultValues: {
    name: string;
    description: string | null;
  };
  isSubmitting?: boolean;
  onSubmit: (data: GroupUpdateRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * Form for editing an existing group's name and description.
 */
export function EditGroupForm({
  defaultValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: EditGroupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupUpdateRequest>({
    resolver: zodResolver(groupUpdateRequestSchema),
    defaultValues: {
      name: defaultValues.name,
      description: defaultValues.description ?? '',
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit({
          ...data,
          description:
            data.description === undefined
              ? undefined
              : data.description?.trim() || null,
        });
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={4}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary-base hover:bg-primary-base/90"
        >
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
