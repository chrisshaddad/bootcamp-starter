'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { registerRequestSchema, type RegisterRequest } from '@repo/contracts';
import { apiPost, ApiError } from '@/lib/api';
import { useUser } from '@/hooks/use-auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  // Explicitly opt out of the 401→login redirect so unauthenticated users can reach this page
  useUser({ redirectOnUnauthenticated: false });

  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
  });

  const onSubmit = async (data: RegisterRequest) => {
    try {
      await apiPost<{ success: boolean }>('/auth/register', data);
      setSubmittedEmail(data.email);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  if (submittedEmail) {
    return (
      <AuthShell>
        <div className="rounded-2xl border border-border bg-card p-7 text-center ring-1 ring-foreground/5">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-300">
            <MailCheck className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a magic link to{' '}
            <span className="font-medium text-foreground">
              {submittedEmail}
            </span>
            . Click it to log in and start using Margin.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            In development the link is printed in the API terminal output.
          </p>
          <Button variant="outline" size="lg" className="mt-6 w-full" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="rounded-2xl border border-border bg-card p-7 ring-1 ring-foreground/5">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Create your organization
          </h1>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary-300 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">
              Organization name <span className="text-error">*</span>
            </Label>
            <Input
              id="organizationName"
              placeholder="Cog & Sprocket Cycles"
              aria-invalid={!!errors.organizationName}
              {...register('organizationName')}
            />
            {errors.organizationName && (
              <p className="text-xs text-error">
                {errors.organizationName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Your name <span className="text-error">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Work email <span className="text-error">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@business.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-error">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create organization'
            )}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
