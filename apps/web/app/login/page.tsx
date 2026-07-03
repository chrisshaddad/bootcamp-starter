'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthCard } from '@/components/auth/auth-card';

const fieldLabel = 'flex gap-0.5 text-[12.5px] font-semibold text-gray-900';
const submitButton =
  'h-12 w-full rounded-[11px] bg-primary-base text-[14.5px] font-bold tracking-[0.2px] text-white shadow-[0_8px_18px_-8px_rgba(39,163,118,0.7)] hover:bg-primary-hover disabled:opacity-60';

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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="magic-email" className={fieldLabel}>
          <span>Email Address</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="magic-email"
          type="email"
          placeholder="you@pharmacy.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-error">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className={submitButton} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Magic Link'
        )}
      </Button>

      <p className="text-center text-xs font-medium leading-relaxed text-gray-400">
        We&apos;ll email you a secure link to sign in instantly.
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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password-email" className={fieldLabel}>
          <span>Email Address</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="password-email"
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
        <Label htmlFor="password" className={fieldLabel}>
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

      <Button type="submit" className={submitButton} disabled={isSubmitting}>
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
    <AuthShell
      topbarRight={
        <>
          Need help?{' '}
          <Link href="/support" className="font-bold text-primary-base">
            Contact support
          </Link>
        </>
      }
    >
      <AuthCard>
        <h2 className="mb-1.5 text-[22px] font-extrabold tracking-[-0.4px] text-gray-900">
          Log in to MedFind
        </h2>
        <p className="mb-5 text-[13.5px] font-medium leading-snug text-gray-600">
          Search live pharmacy stock and manage your branches across Lebanon.
        </p>

        <Tabs defaultValue="magic-link" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-[11px] border border-[#e2ede7] bg-[#f1f6f3] p-1">
            <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>

          <TabsContent value="magic-link" className="pt-5">
            <MagicLinkForm />
          </TabsContent>

          <TabsContent value="password" className="pt-5">
            <Suspense fallback={null}>
              <PasswordForm />
            </Suspense>
          </TabsContent>
        </Tabs>

        <p className="mt-5 text-center text-[13px] font-medium text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-bold text-primary-base hover:underline"
          >
            Sign up
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
