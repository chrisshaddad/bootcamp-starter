'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { User, Library } from 'lucide-react';

import { profileUpdateRequestSchema } from '@repo/contracts';
import type { ProfileUpdateRequest, ProfileResponse } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { usePortalMemberships } from '@/hooks/use-portal-memberships';
import { useImageUpload } from '@/hooks/use-image-upload';
import { ApiError } from '@/lib/api';
import { StatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending Approval',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success-light text-success-dark',
  PENDING: 'bg-warning-light text-warning-dark',
  EXPIRED: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-library-accent-100 text-library-accent-800',
  CANCELLED: 'bg-error-light text-error',
};

// Response dates arrive as string | Date; an <input type="date"> needs yyyy-mm-dd.
function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function toDefaults(profile: ProfileResponse): ProfileUpdateRequest {
  return {
    name: profile.name,
    phoneNumber: profile.phoneNumber ?? '',
    bio: profile.bio ?? '',
    dateOfBirth: toDateInput(profile.dateOfBirth),
    street1: profile.street1 ?? '',
    street2: profile.street2 ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    postalCode: profile.postalCode ?? '',
    country: profile.country ?? '',
    profilePictureUrl: profile.profilePictureUrl ?? '',
  };
}

function AccountProfileForm() {
  const { profile, isLoading, update } = useProfile();
  const { upload, isUploading } = useImageUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileUpdateRequest>({
    resolver: zodResolver(profileUpdateRequestSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      bio: '',
      dateOfBirth: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      profilePictureUrl: '',
    },
  });

  useEffect(() => {
    if (profile) form.reset(toDefaults(profile));
  }, [profile, form]);

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await upload(file);
      form.setValue('profilePictureUrl', url, { shouldDirty: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to upload photo',
      );
    }
  };

  const onSubmit = async (values: ProfileUpdateRequest) => {
    // Empty optional strings clear the field (null); name stays required.
    const clean = <T extends string | null | undefined>(v: T) =>
      typeof v === 'string' && v.trim() === '' ? null : v;
    const payload: ProfileUpdateRequest = {
      name: values.name?.trim(),
      phoneNumber: clean(values.phoneNumber),
      bio: clean(values.bio),
      dateOfBirth: clean(values.dateOfBirth),
      street1: clean(values.street1),
      street2: clean(values.street2),
      city: clean(values.city),
      state: clean(values.state),
      postalCode: clean(values.postalCode),
      country: clean(values.country),
      profilePictureUrl: clean(values.profilePictureUrl),
    };
    try {
      await update(payload);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update profile',
      );
    }
  };

  if (isLoading || !profile) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const avatarUrl = form.watch('profilePictureUrl');
  const name = form.watch('name');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <User className="h-5 w-5 text-muted-foreground" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={avatarUrl || undefined}
                  alt={name || 'Profile photo'}
                  className="object-cover"
                />
                <AvatarFallback>
                  {name?.trim()?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {isUploading
                    ? 'Uploading...'
                    : avatarUrl
                      ? 'Replace photo'
                      : 'Upload photo'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      form.setValue('profilePictureUrl', '', {
                        shouldDirty: true,
                      })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input value={profile.email} disabled readOnly />
                </FormControl>
              </FormItem>
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="A little about you…"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="street1"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Street address</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State / Region</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting || !form.formState.isDirty
                }
              >
                {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function MyLibrariesCard() {
  const { memberships, isLoading } = usePortalMemberships();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Library className="h-5 w-5 text-muted-foreground" />
          My Libraries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !memberships?.length ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t joined any libraries yet.
          </p>
        ) : (
          <div className="space-y-2">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {membership.organization.name}
                  </div>
                  <div className="text-muted-foreground">
                    Card #{membership.libraryCardNumber} &middot;{' '}
                    {membership.membershipType}
                  </div>
                </div>
                <StatusBadge
                  status={membership.membershipStatus}
                  labels={STATUS_LABELS}
                  colors={STATUS_COLORS}
                />
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          To deactivate a membership, visit{' '}
          <a
            href="/my-libraries"
            className="text-library-primary hover:underline"
          >
            My Libraries
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const isPatron = user?.role === 'MEMBER';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPatron
            ? 'Your profile and library memberships'
            : 'Manage your account settings'}
        </p>
      </div>

      <AccountProfileForm />
      {isPatron && <MyLibrariesCard />}
    </div>
  );
}
