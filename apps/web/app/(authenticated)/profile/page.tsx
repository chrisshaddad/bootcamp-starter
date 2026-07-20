'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserCircle } from 'lucide-react';
import {
  selfProfileUpdateRequestSchema,
  type SelfProfileUpdateRequest,
} from '@repo/contracts';
import { useProfile } from '@/hooks/use-profile';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  INSTITUTION_ADMIN: 'Institution Admin',
  STAFF: 'Staff',
  PROFESSIONAL: 'Professional',
  PATIENT: 'Patient',
};

export default function ProfilePage() {
  const { profile, isLoading, error, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const isProfessional = profile?.role === 'PROFESSIONAL';

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SelfProfileUpdateRequest>({
    resolver: zodResolver(selfProfileUpdateRequestSchema),
    values: profile
      ? {
          fullName: profile.fullName,
          phone: profile.phone,
          ...(isProfessional ? { bio: profile.bio ?? '' } : {}),
        }
      : undefined,
  });

  if (error) {
    return (
      <div className="py-10 text-center text-error">
        Failed to load profile. Please try refreshing the page.
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const onSubmit = async (data: SelfProfileUpdateRequest) => {
    setIsSaving(true);
    try {
      await updateProfile({
        ...data,
        ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update profile',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your own account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && (
                  <p className="text-sm text-error">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && (
                  <p className="text-sm text-error">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label>Email</Label>
                <p
                  className="truncate text-sm text-muted-foreground"
                  title={profile.email}
                >
                  {profile.email}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <p className="text-sm text-muted-foreground">
                  {ROLE_LABELS[profile.role] || profile.role}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Institution</Label>
              <p className="text-sm text-muted-foreground">
                {profile.institutionName}
              </p>
            </div>

            {isProfessional && (
              <>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.specialty}
                    <span className="ml-2 text-xs">
                      (set by your institution admin)
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...register('bio')}
                    placeholder="A short bio your patients will see on your care-team profile."
                  />
                  {errors.bio && (
                    <p className="text-sm text-error">{errors.bio.message}</p>
                  )}
                </div>
              </>
            )}

            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
