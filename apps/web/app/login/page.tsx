'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowRight, Building2, Loader2, Mail, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { magicLinkRequestSchema, type MagicLinkRequest } from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { requestMagicLink } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MagicLinkRequest>({
    resolver: zodResolver(magicLinkRequestSchema),
  });

  const onSubmit = async (data: MagicLinkRequest) => {
    setIsSubmitting(true);
    try {
      await requestMagicLink(data);
      toast.success('Magic link sent! Check your email to log in.');
      reset();
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
            Every book, every borrower, back on the shelf.
          </h1>

          {/* Subtext */}
          <p className="text-lg leading-normal text-white/85">
            Sign in to manage your catalog, members, and loans - all in one
            warm, well-organized place.
          </p>

          {/* Secondary CTA - running a library is a distinct path from
              signing in, so it gets its own visible button here rather than
              being buried as fine print. */}
          <a
            href="/register"
            className="group inline-flex w-fit items-center gap-2 rounded-full bg-library-accent-500 px-5 py-2.5 text-sm font-semibold text-library-ink shadow-lg shadow-library-accent-500/30 transition hover:bg-library-accent-400 hover:shadow-xl hover:shadow-library-accent-500/40"
          >
            <Building2 className="h-4 w-4" />
            Register your organization
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full flex-col justify-between bg-linear-to-br from-library-paper via-library-primary-50 to-library-accent-50 lg:w-1/2">
        {/* Form Section */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-120 rounded-3xl border border-library-primary-100 bg-white/80 p-8 shadow-xl shadow-library-primary-900/5 backdrop-blur-sm sm:p-10">
            <div className="flex flex-col items-center gap-8">
              {/* Icon badge */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-library-primary-400 to-library-accent-500 shadow-lg shadow-library-primary-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>

              {/* Title */}
              <div className="flex flex-col items-center gap-1.5 text-center">
                <h2 className="text-2xl font-bold leading-[1.3] text-library-ink">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in with a magic link - no password to remember.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-full space-y-6"
              >
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
                      placeholder="Input your registered email"
                      aria-invalid={!!errors.email}
                      className="pl-12"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-error">{errors.email.message}</p>
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
                      Sending...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>
              </form>

              {/* Info Text */}
              <p className="text-center text-sm font-medium leading-[1.6] text-muted-foreground">
                We&apos;ll send you a magic link to sign in instantly.
                <br />
                No password required.
              </p>

              <div className="h-px w-full bg-library-primary-100" />

              {/* Register a user account */}
              <p className="text-center text-sm font-medium leading-[1.6]">
                <span className="text-muted-foreground">
                  New to NextShelf?{' '}
                </span>
                <a
                  href="/signup"
                  className="font-semibold text-library-primary hover:underline"
                >
                  Create an account
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col items-center gap-4 px-6 py-6">
          {/* Own screen real estate (not just fine print) so it's just as
              noticeable on mobile, where the hero panel's CTA is hidden. */}
          <a
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-library-accent-300 px-4 py-1.5 text-sm font-semibold text-library-ink shadow-md shadow-library-accent-500/20 transition hover:bg-library-accent-400"
          >
            <Building2 className="h-3.5 w-3.5" />
            Own a library? Register your organization
          </a>
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
