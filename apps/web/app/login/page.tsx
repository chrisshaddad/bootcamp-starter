'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Mail, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { magicLinkRequestSchema, type MagicLinkRequest } from '@repo/contracts';
import { useAuth, useUser } from '@/hooks/use-auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';

function LoginForm() {
  const { requestMagicLink } = useAuth();
  const { isAuthenticated, isLoading } = useUser({
    redirectOnUnauthenticated: false,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Redirect already-authenticated users to the dashboard (or the page they came from)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirect = searchParams.get('redirect') ?? '/dashboard';
      router.replace(redirect);
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkRequest>({
    resolver: zodResolver(magicLinkRequestSchema),
  });

  const onSubmit = async (data: MagicLinkRequest) => {
    setIsSubmitting(true);
    try {
      await requestMagicLink(data);
      setSentTo(data.email);
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

  // Avoid a flash of the form while the session check is in flight
  if (isLoading) return null;

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-border bg-card p-7 text-center ring-1 ring-foreground/5">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-300">
          <MailCheck className="size-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Check your inbox
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a secure sign-in link to{' '}
          <span className="font-medium text-foreground">{sentTo}</span>. Click
          it to log in — the link expires in 15 minutes.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          In development the link is printed in the API terminal output.
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-6 w-full"
          onClick={() => setSentTo(null)}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-7 ring-1 ring-foreground/5">
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Margin workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@business.com"
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
              Sending…
            </>
          ) : (
            <>
              <Mail className="size-4" />
              Send magic link
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          No password needed — we&apos;ll email you a secure sign-in link.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Margin?{' '}
        <Link
          href="/register"
          className="font-medium text-primary-300 hover:underline"
        >
          Create an organization
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
