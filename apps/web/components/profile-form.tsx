'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  updateProfileRequestSchema,
  PROFILE_PICTURE_MAX_SIZE_BYTES,
  PROFILE_PICTURE_ALLOWED_MIME_TYPES,
  type UpdateProfileRequest,
  type UserResponse,
  type ProfilePictureUploadResponse,
} from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, apiUpload } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProfileFormProps {
  user: UserResponse;
}

const ORGANIZATION_TYPES = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'AGENCY', label: 'Agency' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'FREELANCE_CLIENT', label: 'Freelance Client' },
] as const;

export function ProfileForm({ user }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const { updateProfile } = useAuth();
  const isDeveloper = user.accountType === 'DEVELOPER';

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: isDeveloper
      ? {
          displayName: user.developerProfile?.displayName ?? '',
          publicSlug: user.developerProfile?.publicSlug ?? '',
          headline: user.developerProfile?.headline ?? '',
          bio: user.developerProfile?.bio ?? '',
          location: user.developerProfile?.location ?? '',
          profilePictureUrl: user.developerProfile?.profilePictureUrl ?? '',
          linkedinUrl: user.developerProfile?.linkedinUrl ?? '',
          personalWebsiteUrl: user.developerProfile?.personalWebsiteUrl ?? '',
        }
      : {
          organizationName: user.hiringProfile?.organizationName ?? '',
          organizationType: user.hiringProfile?.organizationType,
          jobTitle: user.hiringProfile?.jobTitle ?? '',
          organizationWebsiteUrl:
            user.hiringProfile?.organizationWebsiteUrl ?? '',
        },
  });

  // Fields signup doesn't collect yet — if any are still empty this reads as a
  // first-time "complete your profile" pass rather than a routine edit.
  const isProfileIncomplete = isDeveloper
    ? !user.developerProfile?.headline &&
      !user.developerProfile?.bio &&
      !user.developerProfile?.location
    : !user.hiringProfile?.jobTitle;

  const profilePictureUrl = useWatch({ control, name: 'profilePictureUrl' });

  const handlePictureChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !(PROFILE_PICTURE_ALLOWED_MIME_TYPES as readonly string[]).includes(
        file.type,
      )
    ) {
      toast.error('Only JPEG, PNG, WEBP, or GIF images are allowed');
      return;
    }
    if (file.size > PROFILE_PICTURE_MAX_SIZE_BYTES) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setIsUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiUpload<ProfilePictureUploadResponse>(
        '/auth/profile/picture',
        formData,
      );
      setValue('profilePictureUrl', result.profilePictureUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });

      // Reflect the new picture everywhere (navbar, sidebar, etc.) right away —
      // the DB write still only happens when the user hits Save.
      await mutate(
        '/auth/me',
        (current?: UserResponse) =>
          current?.developerProfile
            ? {
                ...current,
                developerProfile: {
                  ...current.developerProfile,
                  profilePictureUrl: result.profilePictureUrl,
                },
              }
            : current,
        { revalidate: false },
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to upload image',
      );
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const onSubmit = async (data: UpdateProfileRequest) => {
    setIsSubmitting(true);
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('That public slug is already taken');
      } else {
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'Unable to update profile',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {isDeveloper ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">
                Display name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                aria-invalid={!!errors.displayName}
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">
                  {errors.displayName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="publicSlug">
                Public slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="publicSlug"
                aria-invalid={!!errors.publicSlug}
                {...register('publicSlug')}
              />
              {errors.publicSlug && (
                <p className="text-sm text-destructive">
                  {errors.publicSlug.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="e.g. Full-stack engineer"
              aria-invalid={!!errors.headline}
              {...register('headline')}
            />
            {errors.headline && (
              <p className="text-sm text-destructive">
                {errors.headline.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself"
              aria-invalid={!!errors.bio}
              {...register('bio')}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. San Francisco, CA"
              aria-invalid={!!errors.location}
              {...register('location')}
            />
            {errors.location && (
              <p className="text-sm text-destructive">
                {errors.location.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profilePicture">Profile picture</Label>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={profilePictureUrl || undefined} />
                <AvatarFallback className="bg-primary-base text-lg font-medium text-white">
                  {(user.developerProfile?.displayName ?? user.email)
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="w-full min-w-0 flex-1 space-y-1">
                <Input
                  id="profilePicture"
                  type="file"
                  accept={PROFILE_PICTURE_ALLOWED_MIME_TYPES.join(',')}
                  disabled={isUploadingPicture}
                  onChange={handlePictureChange}
                />
                {isUploadingPicture && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </p>
                )}
              </div>
            </div>
            {errors.profilePictureUrl && (
              <p className="text-sm text-destructive">
                {errors.profilePictureUrl.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/..."
                aria-invalid={!!errors.linkedinUrl}
                {...register('linkedinUrl')}
              />
              {errors.linkedinUrl && (
                <p className="text-sm text-destructive">
                  {errors.linkedinUrl.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalWebsiteUrl">Personal website</Label>
              <Input
                id="personalWebsiteUrl"
                type="url"
                placeholder="https://..."
                aria-invalid={!!errors.personalWebsiteUrl}
                {...register('personalWebsiteUrl')}
              />
              {errors.personalWebsiteUrl && (
                <p className="text-sm text-destructive">
                  {errors.personalWebsiteUrl.message}
                </p>
              )}
            </div>
          </div>

          {user.developerProfile?.githubUsername && (
            <div className="space-y-2">
              <Label>GitHub</Label>
              <p className="text-sm text-gray-500">
                @{user.developerProfile.githubUsername}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="organizationName">
              Organization name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="organizationName"
              aria-invalid={!!errors.organizationName}
              {...register('organizationName')}
            />
            {errors.organizationName && (
              <p className="text-sm text-destructive">
                {errors.organizationName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationType">
              Organization type <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="organizationType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="organizationType" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.organizationType && (
              <p className="text-sm text-destructive">
                {errors.organizationType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input
              id="jobTitle"
              aria-invalid={!!errors.jobTitle}
              {...register('jobTitle')}
            />
            {errors.jobTitle && (
              <p className="text-sm text-destructive">
                {errors.jobTitle.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationWebsiteUrl">Organization website</Label>
            <Input
              id="organizationWebsiteUrl"
              type="url"
              placeholder="https://..."
              aria-invalid={!!errors.organizationWebsiteUrl}
              {...register('organizationWebsiteUrl')}
            />
            {errors.organizationWebsiteUrl && (
              <p className="text-sm text-destructive">
                {errors.organizationWebsiteUrl.message}
              </p>
            )}
          </div>
        </>
      )}

      <Button type="submit" disabled={isSubmitting || isUploadingPicture}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : isProfileIncomplete ? (
          'Complete profile'
        ) : (
          'Save changes'
        )}
      </Button>
    </form>
  );
}
