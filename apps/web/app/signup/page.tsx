'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Mail, User, UserPlus } from 'lucide-react';
import Image from 'next/image';
import {
  patronRegisterRequestSchema,
  type PatronRegisterRequest,
  type PatronRegisterResponse,
} from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost, ApiError } from '@/lib/api';

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatronRegisterRequest>({
    resolver: zodResolver(patronRegisterRequestSchema),
  });

  const onSubmit = async (data: PatronRegisterRequest) => {
    setIsSubmitting(true);
    try {
      // Not useAuth() - this page runs pre-login (no session cookie exists
      // yet), and useAuth() drags in useUser()'s default
      // redirectOnUnauthenticated behavior, which would bounce an
      // unauthenticated visitor straight back to /login. Same reasoning as
      // apps/web/app/register/page.tsx's org self-registration.
      const result = await apiPost<PatronRegisterResponse>(
        '/auth/register',
        data,
      );
      setRegisteredEmail(result.email);
      toast.success('Account created! Check your email to sign in.');
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
    <div className="flex min-h-dvh bg-library-paper">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 overflow-hidden bg-library-ink lg:flex lg:flex-col lg:justify-end">
        {/* Background Image + warm duotone wash, so the photo reads as part
            of the brand instead of a stock image dropped on top of it */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80"
            alt="Library bookshelves"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-library-ink from-0% via-library-ink/55 via-45% to-transparent to-90%" />
        </div>

        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 z-1 h-96 w-96 rounded-full bg-library-accent-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-32 z-1 h-72 w-72 rounded-full bg-library-primary-500/25 blur-3xl" />

        {/* Content Section */}
        <div className="relative z-10 flex flex-col gap-6 px-12.5 pb-15 pt-10">
          <div className="h-0.75 w-16 rounded-full bg-linear-to-r from-library-accent-300 to-library-accent-600" />

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image
              src="/nextshelf-icon.svg"
              alt="NextShelf"
              width={32}
              height={32}
              priority
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-white">NextShelf</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Your next great read is a click away.
          </h1>

          {/* Subtext */}
          <p className="text-lg leading-normal text-white/85">
            Create your account, discover libraries near you, and start
            borrowing - all in one warm, well-organized place.
          </p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="relative flex w-full flex-col justify-between bg-linear-to-br from-library-paper via-library-primary-50 to-library-accent-50 lg:w-1/2">
        {/* Form Section */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {registeredEmail ? (
            <div className="w-full max-w-120 rounded-3xl border border-library-primary-100 bg-white/80 p-8 shadow-xl shadow-library-primary-900/5 backdrop-blur-sm sm:p-10">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-success to-success-dark shadow-lg shadow-success/30">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold leading-[1.3] text-library-ink">
                  Check your email
                </h2>
                <p className="text-base leading-normal text-muted-foreground">
                  We sent a magic link to{' '}
                  <span className="font-semibold text-library-ink">
                    {registeredEmail}
                  </span>
                  . Click it to sign in - no approval needed.
                </p>
                <a
                  href="/login"
                  className="text-sm font-semibold text-library-primary hover:underline"
                >
                  Back to login
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-120 rounded-3xl border border-library-primary-100 bg-white/80 p-8 shadow-xl shadow-library-primary-900/5 backdrop-blur-sm sm:p-10">
              <div className="flex flex-col items-center gap-8">
                {/* Icon badge */}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-library-primary-400 to-library-accent-500 shadow-lg shadow-library-primary-500/30">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>

                {/* Title */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <h2 className="text-2xl font-bold leading-[1.3] text-library-ink">
                    Create your account
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll email you a magic link to get started.
                  </p>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="w-full space-y-6"
                >
                  <div className="flex flex-col gap-2.5">
                    <Label
                      htmlFor="name"
                      className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                    >
                      <span>Your Name</span>
                      <span className="text-error">*</span>
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-library-primary-400" />
                      <Input
                        id="name"
                        placeholder="Pat Ron"
                        aria-invalid={!!errors.name}
                        className="pl-12"
                        {...register('name')}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-error">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <Label
                      htmlFor="email"
                      className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                    >
                      <span>Email Address</span>
                      <span className="text-error">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-library-primary-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        aria-invalid={!!errors.email}
                        className="pl-12"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-error">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="h-14 w-full rounded-[10px] bg-linear-to-r from-library-primary-500 to-library-primary-600 text-base font-bold leading-normal tracking-[0.3px] text-white shadow-lg shadow-library-primary-500/25 transition hover:-translate-y-0.5 hover:from-library-primary-600 hover:to-library-primary-700 hover:shadow-xl hover:shadow-library-primary-500/30 disabled:translate-y-0 disabled:bg-gray-200 disabled:text-muted-foreground disabled:shadow-none"
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
                </form>

                {/* Sign in link */}
                <p className="text-center text-sm font-medium leading-[1.6]">
                  <span className="text-muted-foreground">
                    Already have an account?{' '}
                  </span>
                  <a
                    href="/login"
                    className="font-semibold text-library-primary hover:underline"
                  >
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium leading-[1.6]">
            <span className="text-muted-foreground">
              © {new Date().getFullYear()} NextShelf. All rights reserved.
            </span>
            <a
              href="/terms"
              className="text-library-ink hover:text-library-primary hover:underline"
            >
              Terms & Conditions
            </a>
            <a
              href="/privacy"
              className="text-library-ink hover:text-library-primary hover:underline"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
