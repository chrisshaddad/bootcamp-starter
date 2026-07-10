'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { toast } from 'sonner';
import { AlertTriangle, Lock, MapPin } from 'lucide-react';
import type { ProfileResponse, ProfileUpdateRequest } from '@repo/contracts';
import { useProfile, useProfileActions } from '@/hooks/use-profile';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneInput } from '@/components/phone-input';
import { DatePicker } from '@/components/date-picker';

// Turn an enum member like SUPER_ADMIN into "Super Admin".
function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Local, string-based form schema for react-hook-form. Mirrors the codebase
// pattern (see the branch form): validate strings here, then map to the typed
// wire contract on submit. Optional fields accept blank.
//
// `initialPhone` is threaded in so a pre-existing number that isn't valid E.164
// (e.g. a seeded/legacy phone) doesn't block saving *other* fields: the stored
// value passes as-is while it's unchanged, but any newly entered number must be
// a valid E.164 (the PhoneInput emits E.164, so edits self-normalize).
function makeProfileFormSchema(initialPhone: string) {
  return z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    phoneNumber: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' || value === initialPhone || isValidPhoneNumber(value),
        'Enter a valid phone number',
      ),
    dateOfBirth: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
        'Enter a valid date',
      ),
    address: z.string().trim().max(1000, 'Address is too long'),
    latitude: z
      .string()
      .trim()
      .refine((value) => {
        if (value === '') return true;
        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed >= -90 && parsed <= 90;
      }, 'Latitude must be between -90 and 90'),
    longitude: z
      .string()
      .trim()
      .refine((value) => {
        if (value === '') return true;
        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed >= -180 && parsed <= 180;
      }, 'Longitude must be between -180 and 180'),
  });
}
type ProfileFormValues = z.infer<ReturnType<typeof makeProfileFormSchema>>;

function toFormValues(profile: ProfileResponse): ProfileFormValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phoneNumber: profile.phoneNumber ?? '',
    dateOfBirth: profile.dateOfBirth
      ? String(profile.dateOfBirth).slice(0, 10)
      : '',
    address: profile.address ?? '',
    latitude: profile.latitude === null ? '' : String(profile.latitude),
    longitude: profile.longitude === null ? '' : String(profile.longitude),
  };
}

function toPayload(data: ProfileFormValues): ProfileUpdateRequest {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber.trim() ? data.phoneNumber.trim() : null,
    dateOfBirth: data.dateOfBirth ? data.dateOfBirth : null,
    address: data.address.trim() ? data.address.trim() : null,
    latitude: data.latitude.trim() === '' ? null : Number(data.latitude),
    longitude: data.longitude.trim() === '' ? null : Number(data.longitude),
  };
}

function Field({
  label,
  error,
  id,
  children,
}: {
  label: string;
  error?: string;
  // Ties the label to its control so screen readers associate them and clicking
  // the label focuses the input. Must match the wrapped control's id.
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

function ReadOnlyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2.5 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{children}</span>
    </div>
  );
}

function ProfileForm({ profile }: { profile: ProfileResponse }) {
  const { updateProfile } = useProfileActions();
  // Rebuild the schema when the stored phone changes so an unchanged legacy
  // number stays valid (see makeProfileFormSchema).
  const formSchema = useMemo(
    () => makeProfileFormSchema(profile.phoneNumber ?? ''),
    [profile.phoneNumber],
  );
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(profile),
  });

  // Re-seed the form if the profile is revalidated (e.g. after a save elsewhere).
  useEffect(() => {
    reset(toFormValues(profile));
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile(toPayload(data));
      toast.success('Profile updated.');
      reset(data); // clear the dirty state
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update profile.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Read-only account identity */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Lock className="h-5 w-5 text-gray-500" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReadOnlyRow label="Email">{profile.email}</ReadOnlyRow>
          <ReadOnlyRow label="Role">
            <span className="inline-flex items-center rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-hover">
              {humanize(profile.role)}
            </span>
          </ReadOnlyRow>
          <ReadOnlyRow label="Status">
            <span className="inline-flex items-center rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success-dark">
              {humanize(profile.status)}
            </span>
          </ReadOnlyRow>
        </CardContent>
      </Card>

      {/* Editable personal details */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Personal information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              error={errors.firstName?.message}
              id="firstName"
            >
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="Jane"
              />
            </Field>
            <Field
              label="Last name"
              error={errors.lastName?.message}
              id="lastName"
            >
              <Input
                id="lastName"
                {...register('lastName')}
                placeholder="Doe"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Phone number"
              error={errors.phoneNumber?.message}
              id="phoneNumber"
            >
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field }) => (
                  <PhoneInput
                    id="phoneNumber"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.phoneNumber)}
                  />
                )}
              />
            </Field>
            <Field
              label="Date of birth"
              error={errors.dateOfBirth?.message}
              id="dateOfBirth"
            >
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field }) => (
                  <DatePicker
                    id="dateOfBirth"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.dateOfBirth)}
                  />
                )}
              />
            </Field>
          </div>

          <Field label="Address" error={errors.address?.message} id="address">
            <Input
              id="address"
              {...register('address')}
              placeholder="123 Main St, City"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Latitude"
              error={errors.latitude?.message}
              id="latitude"
            >
              <div className="relative">
                <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="latitude"
                  {...register('latitude')}
                  inputMode="decimal"
                  placeholder="33.8938"
                  className="pl-9"
                />
              </div>
            </Field>
            <Field
              label="Longitude"
              error={errors.longitude?.message}
              id="longitude"
            >
              <Input
                id="longitude"
                {...register('longitude')}
                inputMode="decimal"
                placeholder="35.5018"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset(toFormValues(profile))}
              disabled={!isDirty || isSubmitting}
            >
              Reset
            </Button>
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export default function AdminProfilePage() {
  const { profile, isLoading, error, mutate } = useProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal details. Your email, role, and status are managed
          by the platform.
        </p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="mb-4 h-12 w-12 text-error" />
          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            Couldn&apos;t load your profile
          </h3>
          <p className="mb-4 max-w-md text-center text-sm text-gray-500">
            Something went wrong while fetching your profile. Please try again.
          </p>
          <Button type="button" onClick={() => mutate()}>
            Try again
          </Button>
        </div>
      ) : isLoading || !profile ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <ProfileForm profile={profile} />
      )}
    </div>
  );
}
