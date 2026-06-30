'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth-shell';
import {
  signupFormSchema,
  type SignupFormValues,
} from '@/components/auth-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'HIRING', label: 'Recruiter / Hiring' },
] as const;

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { accountType: 'DEVELOPER' },
  });

  const accountType = watch('accountType');

  const onSubmit = async () => {
    setIsSubmitting(true);
    // Mock submit — no backend integration yet.
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success('Magic link sent (mock) — check your email.');
    reset({ accountType: 'DEVELOPER' });
    setIsSubmitting(false);
  };

  return (
    <AuthShell
      title="Create your account"
      description="Start showcasing your engineering work on Deployfolio."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-blue hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label>I am a...</Label>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={accountType === option.value ? 'default' : 'outline'}
                className={cn(
                  'h-10',
                  accountType === option.value && 'bg-blue hover:bg-blue/90',
                )}
                onClick={() => setValue('accountType', option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              placeholder="Ada"
              aria-invalid={!!errors.firstName}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              placeholder="Lovelace"
              aria-invalid={!!errors.lastName}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

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
