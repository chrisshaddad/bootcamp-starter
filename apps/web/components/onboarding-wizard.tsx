'use client';

import { useState } from 'react';
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
import { ApiError } from '@/lib/api';

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

export function OnboardingWizard({ user }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { updateProfile } = useAuth();

  const isDev = user.accountType === 'DEVELOPER';

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const {
    register,
    handleSubmit,
    control,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: isDev
      ? {
          displayName: user.developerProfile?.displayName ?? '',
          publicSlug: user.developerProfile?.publicSlug ?? '',
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
          // Use specific type cast instead of 'any'
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

    if (isDev) {
      const generated = slugify(name);
      setValue('publicSlug', generated, { shouldValidate: true });
    }
  };

  const handleNextStep = async () => {
    if (isDev && displayName && !publicSlug) {
      setValue('publicSlug', slugify(displayName), { shouldValidate: true });
    }

    const fieldsToValidate: Path<UpdateProfileRequest>[] = isDev
      ? ['displayName', 'publicSlug']
      : ['organizationName', 'organizationType'];

    console.log('[DEBUG] Wizard - Validating Step 1:', fieldsToValidate);
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setStep(2);
    } else {
      console.log('[DEBUG] Wizard - Validation failed on Step 1');
    }
  };

  const onSubmit = async (data: UpdateProfileRequest) => {
    // 1. Trap premature submissions (e.g. user hits "Enter" on their keyboard during Step 1)
    if (step === 1) {
      handleNextStep();
      return;
    }

    // 2. Validate Step 2 fields explicitly, including checking URL formats
    const step2Fields: Path<UpdateProfileRequest>[] = isDev
      ? ['headline', 'bio', 'location', 'linkedinUrl', 'personalWebsiteUrl']
      : ['jobTitle', 'organizationWebsiteUrl', 'linkedinUrl'];

    const isStep2Valid = await trigger(step2Fields);
    if (!isStep2Valid) {
      console.log('[DEBUG] Wizard - Validation failed on Step 2 URLs/Fields');
      return;
    }

    // 3. Ensure strictly required Step 2 fields are actually filled
    const step2RequiredValue = isDev ? data.headline : data.jobTitle;
    if (!step2RequiredValue || step2RequiredValue.trim() === '') {
      toast.error(
        isDev ? 'Please enter a headline' : 'Please enter a job title',
      );
      return;
    }

    console.log('[DEBUG] Wizard - Submission started...');
    setIsSubmitting(true);
    try {
      await updateProfile(data);

      console.log(
        '[DEBUG] 4. Wizard - Setup complete! Redirecting to dashboard...',
      );
      toast.success('Profile completed!');
      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('That public slug is already taken. Try another one.');
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
    <Card className="shadow-lg border-muted">
      <CardHeader className="bg-muted/30 border-b pb-4 px-6 pt-6">
        <div className="flex items-center justify-between text-sm font-medium">
          <span
            className={
              step >= 1 ? 'text-primary font-semibold' : 'text-muted-foreground'
            }
          >
            1. The Basics
          </span>
          <div className="h-px bg-border flex-1 mx-4" />
          <span
            className={
              step >= 2 ? 'text-primary font-semibold' : 'text-muted-foreground'
            }
          >
            2. Details
          </span>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="pt-6 space-y-6">
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
                  Public Profile URL Slug{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center">
                  <span className="bg-muted text-muted-foreground px-3 py-2 border border-r-0 rounded-l-md text-sm shrink-0">
                    {typeof window !== 'undefined'
                      ? window.location.host
                      : 'site.com'}
                    /
                  </span>
                  <Input
                    id="publicSlug"
                    className="rounded-l-none"
                    placeholder="jane-doe"
                    {...register('publicSlug')}
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
                      <SelectTrigger>
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

        <CardFooter className="flex justify-between border-t bg-muted/10 pt-6">
          {step === 1 ? (
            <div />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}

          {step === 1 ? (
            <Button type="button" onClick={handleNextStep}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
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
