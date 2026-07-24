'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Loader2,
  TrendingUp,
  Compass,
  Briefcase,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { magicLinkRequestSchema, type MagicLinkRequest } from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';

const features = [
  {
    icon: Compass,
    title: 'Explore Paths',
    description: 'Discover career options that match your interests and goals.',
  },
  {
    icon: TrendingUp,
    title: 'Grow Skills',
    description: 'Learn in-demand skills and track your progress.',
  },
  {
    icon: Briefcase,
    title: 'Find Opportunities',
    description: 'Connect with top companies and land your next opportunity.',
  },
];

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
    <div className="flex min-h-screen bg-canvas">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between">
        {/* Background illustration */}
        <Image
          src="/login-hero.png"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
        />
        {/* Legibility overlay: darken the left where the text sits */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[oklch(0.14_0.03_315/0.85)] via-[oklch(0.16_0.03_315/0.35)] to-transparent"
        />

        {/* Content */}
        <div className="relative flex flex-1 flex-col justify-center gap-10 px-14 py-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-primary shadow-lg ring-1 ring-white/10">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">PathWay</span>
          </div>

          {/* Headline block */}
          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold uppercase tracking-[1.5px] text-accent">
              Your career. Your path.
            </span>
            <h1 className="text-5xl font-bold leading-[1.1] tracking-[-0.5px] text-white">
              Find your path.
              <br />
              Build your future.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-white/70">
              Discover career paths, develop the right skills, and connect with
              opportunities that move you forward.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-5">
            {features.map((feature, index) => (
              <div key={feature.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet/30 ring-1 ring-white/15">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  {index < features.length - 1 && (
                    <span className="mt-1 w-px flex-1 border-l border-dashed border-white/20" />
                  )}
                </div>
                <div className="pb-1 pt-1.5">
                  <h3 className="text-base font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-0.5 max-w-xs text-sm leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full flex-col lg:w-1/2">
        {/* Form Section */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[460px] rounded-3xl bg-card p-8 shadow-xl shadow-primary/5 ring-1 ring-border sm:p-10">
            {/* Icon badge */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet/10">
              <TrendingUp className="h-7 w-7 text-violet" />
            </div>

            {/* Title */}
            <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Sign in to continue your career journey.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="email"
                  className="flex gap-0.5 text-sm font-medium text-foreground"
                >
                  <span>Email Address</span>
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    aria-invalid={!!errors.email}
                    className="pl-12"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-xl bg-gradient-to-r from-violet to-primary text-base font-bold tracking-[0.3px] text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Magic Link
                    <Send className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Magic link helper */}
            <div className="mt-5 flex items-start justify-center gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
              <p className="text-center text-sm text-muted-foreground">
                We&apos;ll send you a magic link to sign in instantly.
                <br />
                No password required.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              © {new Date().getFullYear()} PathWay. All rights reserved.
            </span>
            <div className="flex items-center gap-6">
              <a href="/terms" className="hover:text-primary hover:underline">
                Terms &amp; Conditions
              </a>
              <a href="/privacy" className="hover:text-primary hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
