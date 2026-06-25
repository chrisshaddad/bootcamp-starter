'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { registerRequestSchema, type RegisterRequest } from '@repo/contracts';
import { apiPost, ApiError } from '@/lib/api';
import { useUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  // Explicitly opt out of the 401→login redirect so unauthenticated users can reach this page
  useUser({ redirectOnUnauthenticated: false });

  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

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
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex max-w-md flex-col items-center gap-6 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl">✉️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-500">
            We sent a magic link to <strong>{submittedEmail}</strong>. Click it
            to log in and start using Margin.
          </p>
          <p className="text-sm text-gray-400">
            In development the link is printed in the API terminal output.
          </p>
          <Link href="/login" className="text-sm text-gray-500 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex w-full max-w-md flex-col gap-8 px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Create your organization
          </h1>
          <p className="text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-base hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="organizationName">
              Organization name <span className="text-error">*</span>
            </Label>
            <Input
              id="organizationName"
              placeholder="Acme Inc."
              aria-invalid={!!errors.organizationName}
              {...register('organizationName')}
            />
            {errors.organizationName && (
              <p className="text-sm text-error">
                {errors.organizationName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
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
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">
              Work email <span className="text-error">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@acme.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-error">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-[10px] bg-gray-900 text-base font-bold text-white hover:bg-gray-900/90 disabled:bg-gray-200 disabled:text-gray-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create organization'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
