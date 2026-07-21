'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';

import {
  forgotPasswordRequestSchema,
  type ForgotPasswordRequest,
} from '@repo/contracts';
import { AuthShell } from '@/components/auth-shell';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ForgotPasswordForm({ onSent }: { onSent: (email: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestPasswordReset } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordRequestSchema),
  });

  const onSubmit = async (data: ForgotPasswordRequest) => {
    setIsSubmitting(true);
    try {
      await requestPasswordReset(data);
      onSent(data.email);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Sending link...
          </>
        ) : (
          'Send reset link'
        )}
      </Button>
    </form>
  );
}

function SentConfirmation({ email }: { email: string }) {
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
      <p className="text-sm text-muted-foreground">
        If an account exists for <span className="font-medium text-foreground">{email}</span>,
        we&apos;ve sent a link to reset your password. It expires in 30
        minutes.
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to reset it."
      footer={
        <>
          Remembered it after all?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      {sentTo ? (
        <SentConfirmation email={sentTo} />
      ) : (
        <ForgotPasswordForm onSent={setSentTo} />
      )}
    </AuthShell>
  );
}
