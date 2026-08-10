'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  updateProfileRequestSchema,
  type UpdateProfileRequest,
  type UserResponse,
} from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { fetcher, ApiError } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OnboardingWizardProps {
  user: UserResponse;
}

const ORGANIZATION_TYPES = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'AGENCY', label: 'Agency' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'FREELANCE_CLIENT', label: 'Freelance Client' },
] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Convert "john.doe" or "john_doe" to "John Doe"
function formatCleanName(rawName?: string | null): string {
  if (!rawName) return '';
  return rawName
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Ensure initial slug is clean and without punctuation
function formatCleanSlug(
  rawName?: string | null,
  rawSlug?: string | null,
): string {
  if (rawSlug && !rawSlug.startsWith('dev-')) {
    return slugify(rawSlug);
  }
  return slugify(rawName || '');
}

export function OnboardingWizard({ user }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [profileHost, setProfileHost] = useState('site.com');
  const router = useRouter();
  const { updateProfile } = useAuth();

  const isDev = user.accountType === 'DEVELOPER';

  useEffect(() => {
    setProfileHost(window.location.host);
  }, []);

  // Compute clean initial values for developer profile
  const initialDisplayName = isDev
    ? formatCleanName(user.developerProfile?.displayName)
    : '';
  const initialSlug = isDev
    ? formatCleanSlug(
        user.developerProfile?.displayName,
        user.developerProfile?.publicSlug,
      )
    : '';
  const slugWasManuallyEdited = useRef(
    Boolean(
      user.developerProfile?.publicSlug &&
      !user.developerProfile.publicSlug.startsWith('dev-'),
    ),
  );

  const {
    register,
    handleSubmit,
    control,
    trigger,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: isDev
      ? {
          displayName: initialDisplayName,
          publicSlug: initialSlug,
          headline: user.developerProfile?.headline ?? '',
          bio: user.developerProfile?.bio ?? '',
          location: user.developerProfile?.location ?? '',
          linkedinUrl: user.developerProfile?.linkedinUrl ?? '',
          personalWebsiteUrl: user.developerProfile?.personalWebsiteUrl ?? '',
        }
      : {
          organizationName: user.hiringProfile?.organizationName ?? '',
          organizationType: user.hiringProfile?.organizationType,
          jobTitle: user.hiringProfile?.jobTitle ?? '',
          organizationWebsiteUrl:
            user.hiringProfile?.organizationWebsiteUrl ?? '',
          linkedinUrl:
            (user.hiringProfile as { linkedinUrl?: string | null })
              ?.linkedinUrl ?? '',
        },
    mode: 'onChange',
  });

  const displayName = watch('displayName');
  const publicSlug = watch('publicSlug');

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('displayName', name, { shouldValidate: true });

    if (isDev && !slugWasManuallyEdited.current) {
      const generated = slugify(name);
      setValue('publicSlug', generated, { shouldValidate: true });
    }
  };

  const handlePublicSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    slugWasManuallyEdited.current = true;
    setValue('publicSlug', e.target.value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleNextStep = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    if (isDev && displayName && !publicSlug) {
      setValue('publicSlug', slugify(displayName), { shouldValidate: true });
    }

    const fieldsToValidate: Path<UpdateProfileRequest>[] = isDev
      ? ['displayName', 'publicSlug']
      : ['organizationName', 'organizationType'];

    const isValid = await trigger(fieldsToValidate);

    if (!isValid) {
      return;
    }

    // Verify handle uniqueness against the API when pressing Continue
    if (isDev && publicSlug) {
      if (publicSlug !== user.developerProfile?.publicSlug) {
        setIsCheckingSlug(true);
        try {
          const existing = await fetcher<{ id: string }>(
            `/users/slug/${encodeURIComponent(publicSlug)}`,
          );
          if (existing && existing.id !== user.id) {
            setError('publicSlug', {
              type: 'manual',
              message:
                'This public handle is already taken. Please try another.',
            });
            setIsCheckingSlug(false);
            return;
          }
        } catch (err) {
          // If 404, the handle is available!
          if (err instanceof ApiError && err.status !== 404) {
            console.error('[DEBUG] Slug check error:', err);
          }
        } finally {
          setIsCheckingSlug(false);
        }
      }
    }

    setStep(2);
  };

  const onSubmit = async (data: UpdateProfileRequest) => {
    if (step === 1) {
      await handleNextStep();
      return;
    }

    const step2Fields: Path<UpdateProfileRequest>[] = isDev
      ? ['headline', 'bio', 'location', 'linkedinUrl', 'personalWebsiteUrl']
      : ['jobTitle', 'organizationWebsiteUrl', 'linkedinUrl'];

    const isStep2Valid = await trigger(step2Fields);
    if (!isStep2Valid) {
      return;
    }

    const step2RequiredValue = isDev ? data.headline : data.jobTitle;
    if (!step2RequiredValue || step2RequiredValue.trim() === '') {
      toast.error(
        isDev ? 'Please enter a headline' : 'Please enter a job title',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile(data);
      toast.success('Profile completed!');
      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('That public handle is already taken. Try another one.');
        setStep(1);
      } else {
        toast.error(
          error instanceof ApiError ? error.message : 'Something went wrong',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="min-w-0 overflow-hidden border-muted shadow-lg">
      <CardHeader className="border-b bg-muted/30 px-4 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center justify-between text-xs font-medium sm:text-sm">
          <span
            className={`shrink-0 whitespace-nowrap ${
              step >= 1 ? 'font-semibold text-primary' : 'text-muted-foreground'
            }`}
          >
            1. The Basics
          </span>
          <div className="mx-2 h-px min-w-3 flex-1 bg-border sm:mx-4" />
          <span
            className={`shrink-0 whitespace-nowrap ${
              step >= 2 ? 'font-semibold text-primary' : 'text-muted-foreground'
            }`}
          >
            2. Details
          </span>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="min-w-0 space-y-6 px-4 pt-6 sm:px-6">
          {/* STEP 1: Required Fields */}
          {step === 1 && isDev && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="displayName">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Jane Doe"
                  value={displayName ?? ''}
                  onChange={handleDisplayNameChange}
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive">
                    {errors.displayName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="publicSlug">
                  Public Profile Handle{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
                  <span className="flex min-w-0 items-center break-all rounded-t-md border border-b-0 bg-muted px-3 py-2 text-sm text-muted-foreground sm:max-w-[55%] sm:shrink-0 sm:truncate sm:whitespace-nowrap sm:rounded-l-md sm:rounded-tr-none sm:border-r-0 sm:border-b">
                    {profileHost}/developers/
                  </span>
                  <Input
                    id="publicSlug"
                    className="min-w-0 rounded-t-none sm:rounded-l-none sm:rounded-tr-[10px]"
                    placeholder="jane-doe"
                    {...register('publicSlug')}
                    onChange={handlePublicSlugChange}
                  />
                </div>
                {errors.publicSlug && (
                  <p className="text-sm text-destructive">
                    {errors.publicSlug.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 1 && !isDev && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="organizationName">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="organizationName"
                  placeholder="e.g. Acme Corp"
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
                  Organization Type <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="organizationType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
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
            </div>
          )}

          {/* STEP 2: Extended Details */}
          {step === 2 && isDev && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="headline">
                  Headline <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="headline"
                  placeholder="e.g. Full-stack engineer building web applications"
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
                  placeholder="Tell us about yourself and what you are building..."
                  {...register('bio')}
                />
                {errors.bio && (
                  <p className="text-sm text-destructive">
                    {errors.bio.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. San Francisco, CA"
                  {...register('location')}
                />
                {errors.location && (
                  <p className="text-sm text-destructive">
                    {errors.location.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    {...register('linkedinUrl')}
                  />
                  {errors.linkedinUrl && (
                    <p className="text-sm text-destructive">
                      {errors.linkedinUrl.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalWebsiteUrl">Personal Website</Label>
                  <Input
                    id="personalWebsiteUrl"
                    type="url"
                    placeholder="https://..."
                    {...register('personalWebsiteUrl')}
                  />
                  {errors.personalWebsiteUrl && (
                    <p className="text-sm text-destructive">
                      {errors.personalWebsiteUrl.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && !isDev && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">
                  Job Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Technical Recruiter"
                  {...register('jobTitle')}
                />
                {errors.jobTitle && (
                  <p className="text-sm text-destructive">
                    {errors.jobTitle.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    {...register('linkedinUrl')}
                  />
                  {errors.linkedinUrl && (
                    <p className="text-sm text-destructive">
                      {errors.linkedinUrl.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationWebsiteUrl">
                    Organization Website
                  </Label>
                  <Input
                    id="organizationWebsiteUrl"
                    type="url"
                    placeholder="https://..."
                    {...register('organizationWebsiteUrl')}
                  />
                  {errors.organizationWebsiteUrl && (
                    <p className="text-sm text-destructive">
                      {errors.organizationWebsiteUrl.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter
          className={`flex flex-col-reverse items-stretch gap-3 border-t bg-muted/10 px-4 pt-6 sm:flex-row sm:items-center sm:px-6 ${
            step === 1 ? 'sm:justify-end' : 'sm:justify-between'
          }`}
        >
          {step !== 1 && (
            <Button
              key="back-btn"
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setStep(1)}
              disabled={isSubmitting || isCheckingSlug}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}

          {step === 1 ? (
            <Button
              key="continue-btn"
              type="button"
              className="w-full sm:w-auto"
              onClick={handleNextStep}
              disabled={isCheckingSlug}
            >
              {isCheckingSlug ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              key="submit-btn"
              type="submit"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSubmitting ? 'Saving...' : 'Complete Setup'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
