'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import Image from 'next/image';
import { signupRequestSchema, type SignupRequest } from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';

function SignupForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const { signup } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <form onSubmit={handleSubmit(onSubmit)} className="w-78.75 space-y-6">
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2.5">
          <Label
            htmlFor="firstName"
            className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
          >
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

        <div className="flex flex-1 flex-col gap-2.5">
          <Label
            htmlFor="lastName"
            className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
          >
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

      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor="email"
          className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
        >
          <span>Email Address</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Input your email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor="phoneNumber"
          className="text-sm font-medium leading-[1.6] text-gray-900"
        >
          Phone Number{' '}
          <span className="font-normal text-gray-500">(optional)</span>
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="Input your phone number"
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

      <Button
        type="submit"
        className="h-14 w-full rounded-[10px] bg-gray-900 text-base font-bold leading-normal tracking-[0.3px] text-white hover:bg-gray-900/90 disabled:bg-gray-200 disabled:text-gray-500"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <p className="text-center text-sm font-medium leading-[1.6] text-gray-500">
        We&apos;ll email you a magic link to verify your address and sign in.
      </p>
    </form>
  );
}

function CheckEmail({ email }: { email: string }) {
  return (
    <div className="flex w-78.75 flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
        <MailCheck className="h-7 w-7 text-primary-base" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Check your email</h3>
      <p className="text-sm font-medium leading-[1.6] text-gray-500">
        If <span className="text-gray-900">{email}</span> isn&apos;t already
        registered, we&apos;ve sent a magic link to it. Click the link to verify
        your account and sign in.
      </p>
    </div>
  );
}

export default function SignupPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 bg-gray-900 lg:flex lg:flex-col lg:justify-end">
        <div className="relative flex-1">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
            alt="Team collaboration"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6 border-t-[5px] border-primary-base bg-gray-900 px-12.5 pb-15 pt-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center">
              <span className="text-2xl text-primary-base">✦</span>
            </div>
            <span className="text-xl font-semibold text-white">
              Bootcamp Starter
            </span>
          </div>

          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Build your next project on a solid foundation.
          </h1>

          <p className="text-lg leading-normal text-white">
            A generic full-stack starter for your bootcamp project.
          </p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-120 flex-col items-center gap-8">
            <h2 className="w-full text-center text-2xl font-bold leading-[1.3] text-gray-900">
              {submittedEmail ? 'Almost there' : 'Create your account'}
            </h2>

            {submittedEmail ? (
              <CheckEmail email={submittedEmail} />
            ) : (
              <SignupForm onSuccess={setSubmittedEmail} />
            )}

            <p className="text-center text-sm font-medium leading-[1.6]">
              <span className="text-gray-500">Already have an account? </span>
              <a href="/login" className="text-primary-base hover:underline">
                Log in
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium leading-[1.6]">
            <span className="text-gray-500">
              © {new Date().getFullYear()} Bootcamp Starter. All rights
              reserved.
            </span>
            <a
              href="/terms"
              className="text-gray-900 hover:text-primary-base hover:underline"
            >
              Terms & Conditions
            </a>
            <a
              href="/privacy"
              className="text-gray-900 hover:text-primary-base hover:underline"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
