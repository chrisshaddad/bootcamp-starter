'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
    <div className="flex min-h-screen bg-library-paper">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 bg-library-ink lg:flex lg:flex-col lg:justify-end">
        <div className="relative flex-1">
          <Image
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80"
            alt="Library bookshelves"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6 border-t-[5px] border-library-accent bg-library-ink px-12.5 pb-15 pt-10">
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

          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Your next great read is a click away.
          </h1>

          <p className="text-lg leading-normal text-white">
            Create your account, discover libraries near you, and start
            borrowing. We&apos;ll email you a magic link to get started.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {registeredEmail ? (
            <div className="flex w-full max-w-120 flex-col items-center gap-6 text-center">
              <CheckCircle2 className="h-14 w-14 text-success" />
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
                className="text-sm font-medium text-library-primary hover:underline"
              >
                Back to login
              </a>
            </div>
          ) : (
            <div className="flex w-full max-w-120 flex-col items-center gap-8">
              <h2 className="w-full text-center text-2xl font-bold leading-[1.3] text-library-ink">
                Create your account
              </h2>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-78.75 space-y-5"
              >
                <div className="flex flex-col gap-2.5">
                  <Label
                    htmlFor="name"
                    className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                  >
                    <span>Your Name</span>
                    <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Pat Ron"
                    aria-invalid={!!errors.name}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-error">{errors.name.message}</p>
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
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-error">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-[10px] bg-library-primary text-base font-bold leading-normal tracking-[0.3px] text-white hover:bg-library-ink disabled:bg-gray-200 disabled:text-muted-foreground"
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

              <p className="text-center text-sm font-medium leading-[1.6]">
                <span className="text-muted-foreground">
                  Already have an account?{' '}
                </span>
                <a
                  href="/login"
                  className="text-library-primary hover:underline"
                >
                  Sign in
                </a>
              </p>
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
