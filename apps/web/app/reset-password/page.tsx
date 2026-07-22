'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, XCircle } from 'lucide-react';

import { AuthShell } from '@/components/auth-shell';
import { PasswordInput } from '@/components/password-input';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const resetPasswordFormSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

function InvalidLink() {
  return (
    <div className="space-y-4 text-center">
      <XCircle className="mx-auto h-10 w-10 text-destructive" />
      <p className="text-sm text-muted-foreground">
        This reset link is missing or invalid.
      </p>
      <Button asChild className="h-12 w-full">
        <Link href="/forgot-password">Request a new link</Link>
      </Button>
    </div>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenRejected, setTokenRejected] = useState(false);
  const router = useRouter();
  const { resetPassword } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await resetPassword({ token, newPassword: data.newPassword });
      toast.success('Password updated.');
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setTokenRejected(true);
      } else {
        toast.error(
          error instanceof ApiError ? error.message : 'Something went wrong.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tokenRejected) {
    return (
      <div className="space-y-4 text-center">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          This reset link is invalid, expired, or has already been used.
        </p>
        <Button asChild className="h-12 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput
          id="newPassword"
          placeholder="••••••••"
          aria-invalid={!!errors.newPassword}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="text-sm text-destructive">
            {errors.newPassword.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="••••••••"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          'Save new password'
        )}
      </Button>
    </form>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return token ? <ResetPasswordForm token={token} /> : <InvalidLink />;
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Choose a new password for your account."
      footer={
        <>
          Remembered it after all?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </AuthShell>
  );
}
