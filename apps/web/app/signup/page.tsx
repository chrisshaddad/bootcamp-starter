'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import { signupRequestSchema, type SignupRequest } from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { AuthShell, AuthCanvas } from '@/components/auth/auth-shell';
import { AuthCard } from '@/components/auth/auth-card';
import { LocationPicker } from '@/components/location-picker';
import { PENDING_LOCATION_KEY } from '@/hooks/use-pending-location';

const fieldLabel = 'flex gap-0.5 text-[12.5px] font-semibold text-gray-900';
const submitButton =
  'h-12 w-full rounded-[11px] bg-primary-base text-[14.5px] font-bold tracking-[0.2px] text-white shadow-[0_8px_18px_-8px_rgba(39,163,118,0.7)] hover:bg-primary-hover disabled:opacity-60';

function SignupForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const { signup } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Optional location. Signup is pre-auth so it can't be saved yet; we stash it
  // and apply it via PATCH /profile on the client's first signed-in load
  // (see useApplyPendingLocation).
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupRequest>({
    resolver: zodResolver(signupRequestSchema),
  });

  const onSubmit = async (data: SignupRequest) => {
    setIsSubmitting(true);
    try {
      await signup(data);
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (
        latitude.trim() !== '' &&
        longitude.trim() !== '' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        // Tag the stash with the signup email so it can only be applied to the
        // matching account — on a shared browser a later signup overwrites this
        // key, and without an owner marker the wrong profile would inherit it.
        window.localStorage.setItem(
          PENDING_LOCATION_KEY,
          JSON.stringify({ lat, lng, email: data.email }),
        );
      }
      // Registration emails a magic link; the client clicks it to set their
      // password and finish onboarding. The pending location (if any) is applied
      // on their first fully signed-in load, after that step.
      onSuccess(data.email);
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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="firstName" className={fieldLabel}>
            <span>First Name</span>
            <span className="text-error">*</span>
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Jane"
            aria-invalid={!!errors.firstName}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-sm text-error">{errors.firstName.message}</p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="lastName" className={fieldLabel}>
            <span>Last Name</span>
            <span className="text-error">*</span>
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Doe"
            aria-invalid={!!errors.lastName}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-sm text-error">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className={fieldLabel}>
          <span>Email Address</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@pharmacy.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="phoneNumber"
          className="text-[12.5px] font-semibold text-gray-900"
        >
          Phone Number{' '}
          <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="+961 …"
          aria-invalid={!!errors.phoneNumber}
          {...register('phoneNumber', {
            setValueAs: (value: string) =>
              value.trim() === '' ? undefined : value,
          })}
        />
        {errors.phoneNumber && (
          <p className="text-sm text-error">{errors.phoneNumber.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="location"
          className="text-[12.5px] font-semibold text-gray-900"
        >
          Location <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <p className="-mt-1 text-[12px] text-gray-500">
          Set it now to find the nearest pharmacies right away — or add it later
          from your profile.
        </p>
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </div>

      <Button type="submit" className={submitButton} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <p className="text-center text-xs font-medium leading-relaxed text-gray-400">
        We&apos;ll email you a magic link to set your password. After that you
        can sign in with your password or a magic link.
      </p>
    </form>
  );
}

function CheckEmail({ email }: { email: string }) {
  return (
    <AuthCard className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-hover">
        <MailCheck className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-lg font-extrabold text-gray-900">
        Check your email
      </h3>
      <p className="text-sm font-medium leading-relaxed text-gray-600">
        We&apos;ve sent a magic link to{' '}
        <span className="font-semibold text-gray-900">{email}</span>. Click it
        to set your password and finish creating your account.
      </p>
      <Link
        href="/login"
        className="mt-5 inline-block text-sm font-bold text-primary-base hover:underline"
      >
        Back to login
      </Link>
    </AuthCard>
  );
}

export default function SignupPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  if (submittedEmail) {
    return (
      <AuthCanvas>
        <CheckEmail email={submittedEmail} />
      </AuthCanvas>
    );
  }

  return (
    <AuthShell
      topbarRight={
        <>
          Already a member?{' '}
          <Link href="/login" className="font-bold text-primary-base">
            Log in
          </Link>
        </>
      }
    >
      {/* Card keeps its rounded corners (overflow-hidden); the inner wrapper is
          what scrolls, so its scrollbar sits inset from the padding and never
          rides over the curved edges. */}
      <AuthCard className="max-h-[88dvh] overflow-hidden">
        <div className="max-h-[calc(88dvh-4rem)] overflow-y-auto pr-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
          <h2 className="mb-1.5 text-[22px] font-extrabold tracking-[-0.4px] text-gray-900">
            Create your account
          </h2>
          <p className="mb-5 text-[13.5px] font-medium leading-snug text-gray-600">
            Join MedFind to find and manage medicine availability across
            Lebanon.
          </p>
          <SignupForm onSuccess={setSubmittedEmail} />
          <p className="mt-5 text-center text-[13px] font-medium text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-primary-base hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
