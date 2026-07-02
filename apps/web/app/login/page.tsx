'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import {
  magicLinkRequestSchema,
  passwordLoginRequestSchema,
  type MagicLinkRequest,
  type PasswordLoginRequest,
} from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/lib/api';
import { getSafeRedirectPath } from '@/lib/redirect';

function MagicLinkForm() {
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
    <form onSubmit={handleSubmit(onSubmit)} className="w-78.75 space-y-6">
      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor="magic-email"
          className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
        >
          <span>Email Address</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="magic-email"
          type="email"
          placeholder="Input your registered email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-error">{errors.email.message}</p>
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
            Sending...
          </>
        ) : (
          'Send Magic Link'
        )}
      </Button>

      <p className="text-center text-sm font-medium leading-[1.6] text-gray-500">
        We&apos;ll send you a magic link to sign in instantly.
        <br />
        No password required.
      </p>
    </form>
  );
}

function PasswordForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordLoginRequest>({
    resolver: zodResolver(passwordLoginRequestSchema),
  });

  const onSubmit = async (data: PasswordLoginRequest) => {
    setIsSubmitting(true);
    try {
      await login(data);
      toast.success('Signed in successfully!');
      router.replace(getSafeRedirectPath(searchParams.get('redirect')));
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
      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor="password-email"
          className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
        >
          <span>Email Address</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="password-email"
          type="email"
          placeholder="Input your registered email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor="password"
          className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
        >
          <span>Password</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Input your password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-error">{errors.password.message}</p>
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
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 bg-gray-900 lg:flex lg:flex-col lg:justify-end">
        {/* Background Image */}
        <div className="relative flex-1">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
            alt="Team collaboration"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Content Section with green top border */}
        <div className="flex flex-col gap-6 border-t-[5px] border-primary-base bg-gray-900 px-12.5 pb-15 pt-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center">
              <span className="text-2xl text-primary-base">✦</span>
            </div>
            <span className="text-xl font-semibold text-white">
              Bootcamp Starter
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Build your next project on a solid foundation.
          </h1>

          {/* Subtext */}
          <p className="text-lg leading-normal text-white">
            A generic full-stack starter for your bootcamp project.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        {/* Form Section */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-120 flex-col items-center gap-8">
            {/* Title */}
            <h2 className="w-full text-center text-2xl font-bold leading-[1.3] text-gray-900">
              Login first to your account
            </h2>

            {/* Auth method tabs */}
            <Tabs defaultValue="magic-link" className="w-78.75 items-center">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>

              <TabsContent value="magic-link" className="pt-6">
                <MagicLinkForm />
              </TabsContent>

              <TabsContent value="password" className="pt-6">
                <Suspense fallback={null}>
                  <PasswordForm />
                </Suspense>
              </TabsContent>
            </Tabs>

            {/* Sign-up Link */}
            <p className="text-center text-sm font-medium leading-[1.6]">
              <span className="text-gray-500">Don&apos;t have an account? </span>
              <a href="/signup" className="text-primary-base hover:underline">
                Sign up
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
