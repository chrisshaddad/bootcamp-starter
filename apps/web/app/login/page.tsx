'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth-shell';
import { loginFormSchema, type LoginFormValues } from '@/components/auth-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async () => {
    setIsSubmitting(true);
    // Mock submit — no backend integration yet.
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success('Magic link sent (mock) — check your email.');
    reset();
    setIsSubmitting(false);
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Enter your email and we'll send you a magic link to log in."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue hover:underline">
            Sign up
          </Link>
        </>
      }
    >
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

        <Button
          type="submit"
          className="h-12 w-full bg-blue text-white hover:bg-blue/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending magic link...
            </>
          ) : (
            'Send magic link'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
