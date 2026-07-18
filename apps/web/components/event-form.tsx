'use client';

import { useEffect } from 'react';
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  eventCreateRequestSchema,
  eventUpdateRequestSchema,
  type EventCreateRequest,
  type EventUpdateRequest,
} from '@repo/contracts';
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
import { useMembers } from '@/hooks/use-members';
import { useOrganizations } from '@/hooks/use-organizations';

function toDateTimeLocalValue(value: string | Date | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoStartsAt(value: string | Date): string {
  return new Date(value).toISOString();
}

interface EventFormFieldsProps {
  isSuperAdmin: boolean;
  showOrganizationSelect: boolean;
  membersOrganizationId?: string;
  startsAt: string;
  presenterId: string | null | undefined;
  organizationId?: string;
  errors: FieldErrors<EventCreateRequest> | FieldErrors<EventUpdateRequest>;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  registerEventName: UseFormRegister<EventCreateRequest | EventUpdateRequest>;
  onOrganizationChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onPresenterChange: (value: string | null) => void;
  onCancel: () => void;
}

function EventFormFields({
  isSuperAdmin,
  showOrganizationSelect,
  membersOrganizationId,
  startsAt,
  presenterId,
  organizationId,
  errors,
  isSubmitting,
  submitLabel,
  submittingLabel,
  registerEventName,
  onOrganizationChange,
  onStartsAtChange,
  onPresenterChange,
  onCancel,
}: EventFormFieldsProps) {
  const { organizations, isLoading: orgsLoading } = useOrganizations({
    enabled: showOrganizationSelect,
    status: 'ACTIVE',
  });

  const { members, isLoading: membersLoading } = useMembers({
    enabled: !isSuperAdmin || !!membersOrganizationId,
    organizationId: isSuperAdmin ? membersOrganizationId : undefined,
  });

  return (
    <>
      {showOrganizationSelect && (
        <div className="space-y-2">
          <Label htmlFor="organizationId">Organization</Label>
          <Select
            value={organizationId ?? ''}
            onValueChange={onOrganizationChange}
            disabled={orgsLoading}
          >
            <SelectTrigger id="organizationId" className="w-full">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations?.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {'organizationId' in errors && errors.organizationId && (
            <p className="text-sm text-error">
              {errors.organizationId.message ?? 'Organization is required'}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="eventName">Event name</Label>
        <Input
          id="eventName"
          {...registerEventName('eventName')}
          placeholder="Team sync"
        />
        {errors.eventName && (
          <p className="text-sm text-error">{errors.eventName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="startsAt">Starts at</Label>
        <Input
          id="startsAt"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => onStartsAtChange(e.target.value)}
        />
        {errors.startsAt && (
          <p className="text-sm text-error">
            {errors.startsAt.message ?? 'Start time is required'}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="presenterId">Presenter (optional)</Label>
        <Select
          value={presenterId ?? '__none__'}
          onValueChange={(value) =>
            onPresenterChange(value === '__none__' ? null : value)
          }
          disabled={
            membersLoading ||
            (isSuperAdmin && showOrganizationSelect && !organizationId)
          }
        >
          <SelectTrigger id="presenterId" className="w-full">
            <SelectValue placeholder="No presenter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No presenter</SelectItem>
            {members?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.username} ({member.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.presenterId && (
          <p className="text-sm text-error">{errors.presenterId.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            (showOrganizationSelect && isSuperAdmin && !organizationId)
          }
          className="bg-primary-base hover:bg-primary-base/90"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}

interface CreateEventFormProps {
  isSuperAdmin: boolean;
  isSubmitting?: boolean;
  onSubmit: (data: EventCreateRequest) => Promise<void>;
  onCancel: () => void;
}

export function CreateEventForm({
  isSuperAdmin,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: CreateEventFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventCreateRequest>({
    resolver: zodResolver(eventCreateRequestSchema),
    defaultValues: {
      eventName: '',
      startsAt: '',
      presenterId: null,
      organizationId: undefined,
    },
  });

  const organizationId = watch('organizationId');
  const presenterId = watch('presenterId');
  const startsAt = watch('startsAt');

  useEffect(() => {
    if (isSuperAdmin) {
      setValue('presenterId', null);
    }
  }, [organizationId, isSuperAdmin, setValue]);

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit({
          ...data,
          startsAt: toIsoStartsAt(data.startsAt),
          presenterId: data.presenterId || null,
        });
      })}
    >
      <EventFormFields
        isSuperAdmin={isSuperAdmin}
        showOrganizationSelect={isSuperAdmin}
        membersOrganizationId={organizationId}
        startsAt={
          typeof startsAt === 'string'
            ? startsAt.slice(0, 16)
            : toDateTimeLocalValue(startsAt)
        }
        presenterId={presenterId}
        organizationId={organizationId}
        errors={errors}
        isSubmitting={isSubmitting}
        submitLabel="Create event"
        submittingLabel="Creating..."
        registerEventName={
          register as UseFormRegister<EventCreateRequest | EventUpdateRequest>
        }
        onOrganizationChange={(value) =>
          setValue('organizationId', value, { shouldValidate: true })
        }
        onStartsAtChange={(value) =>
          setValue('startsAt', value, { shouldValidate: true })
        }
        onPresenterChange={(value) =>
          setValue('presenterId', value, { shouldValidate: true })
        }
        onCancel={onCancel}
      />
    </form>
  );
}

interface EditEventFormProps {
  isSuperAdmin: boolean;
  defaultValues: {
    eventName: string;
    startsAt: string | Date;
    presenterId: string | null;
    organizationId: string;
  };
  isSubmitting?: boolean;
  onSubmit: (data: EventUpdateRequest) => Promise<void>;
  onCancel: () => void;
}

export function EditEventForm({
  isSuperAdmin,
  defaultValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: EditEventFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventUpdateRequest>({
    resolver: zodResolver(eventUpdateRequestSchema),
    defaultValues: {
      eventName: defaultValues.eventName,
      startsAt: toDateTimeLocalValue(defaultValues.startsAt),
      presenterId: defaultValues.presenterId,
    },
  });

  const presenterId = watch('presenterId');
  const startsAt = watch('startsAt');

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit({
          ...data,
          startsAt: data.startsAt ? toIsoStartsAt(data.startsAt) : undefined,
          presenterId:
            data.presenterId === undefined
              ? undefined
              : data.presenterId || null,
        });
      })}
    >
      <EventFormFields
        isSuperAdmin={isSuperAdmin}
        showOrganizationSelect={false}
        membersOrganizationId={defaultValues.organizationId}
        startsAt={
          typeof startsAt === 'string'
            ? startsAt.slice(0, 16)
            : toDateTimeLocalValue(startsAt)
        }
        presenterId={presenterId}
        errors={errors}
        isSubmitting={isSubmitting}
        submitLabel="Save changes"
        submittingLabel="Saving..."
        registerEventName={
          register as UseFormRegister<EventCreateRequest | EventUpdateRequest>
        }
        onOrganizationChange={() => undefined}
        onStartsAtChange={(value) =>
          setValue('startsAt', value, { shouldValidate: true })
        }
        onPresenterChange={(value) =>
          setValue('presenterId', value, { shouldValidate: true })
        }
        onCancel={onCancel}
      />
    </form>
  );
}
