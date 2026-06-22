'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { gymRegisterRequestSchema, type GymRegisterRequest } from '@repo/contracts';
import { apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GymRegisterRequest>({
    resolver: zodResolver(gymRegisterRequestSchema),
    mode: 'onTouched',
  });

  const descriptionValue = watch('description') ?? '';
  const descriptionWordCount =
    descriptionValue.trim() === '' ? 0 : descriptionValue.trim().split(/\s+/).length;

  const onSubmit = async (data: GymRegisterRequest) => {
    setIsSubmitting(true);
    try {
      await apiPost('/gyms/register', data);
      setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex w-full max-w-md flex-col items-center gap-6 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-base/10">
            <span className="text-3xl text-primary-base">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Registration submitted!
          </h1>
          <p className="text-gray-500">
            Your gym registration is pending approval. Once a platform admin
            reviews it, you&apos;ll receive a magic-link email to log in.
          </p>
          <Link
            href="/login"
            className="text-sm font-medium text-primary-base hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-2xl text-primary-base">✦</span>
            <span className="text-xl font-semibold text-gray-900">
              GymOS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Register your gym
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Submit your gym details for approval. You&apos;ll receive a
            magic-link email to get started once approved.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Gym Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="flex gap-0.5 text-sm font-medium text-gray-900">
              Gym Name <span className="text-error">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Iron Paradise Gym"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Owner Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ownerName" className="flex gap-0.5 text-sm font-medium text-gray-900">
              Your Name <span className="text-error">*</span>
            </Label>
            <Input
              id="ownerName"
              placeholder="e.g. Jane Doe"
              aria-invalid={!!errors.ownerName}
              {...register('ownerName')}
            />
            {errors.ownerName && (
              <p className="text-sm text-error">{errors.ownerName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="flex gap-0.5 text-sm font-medium text-gray-900">
              Email Address <span className="text-error">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@ironparadise.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-error">{errors.email.message}</p>
            )}
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="flex gap-0.5 text-sm font-medium text-gray-900">
              Phone Number <span className="text-error">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. +1 555 000 1234"
              aria-invalid={!!errors.phone}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-error">{errors.phone.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="address" className="flex gap-0.5 text-sm font-medium text-gray-900">
              Gym Address <span className="text-error">*</span>
            </Label>
            <Textarea
              id="address"
              placeholder="e.g. 123 Main St, New York, NY 10001"
              rows={2}
              aria-invalid={!!errors.address}
              {...register('address')}
            />
            {errors.address && (
              <p className="text-sm text-error">{errors.address.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-900">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Tell us about your gym..."
              rows={3}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            <div className={`text-xs text-right ${descriptionWordCount > 200 ? 'text-red-500' : 'text-gray-400'}`}>
              {descriptionWordCount} / 200 words
            </div>
            {errors.description && (
              <p className="text-sm text-error">{errors.description.message}</p>
            )}
          </div>

          {/* Website */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="website" className="text-sm font-medium text-gray-900">
              Website <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="website"
              type="url"
              placeholder="https://ironparadise.com"
              aria-invalid={!!errors.website}
              {...register('website')}
            />
            {errors.website && (
              <p className="text-sm text-error">{errors.website.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="h-14 w-full rounded-[10px] bg-gray-900 text-base font-bold text-white hover:bg-gray-900/90 disabled:bg-gray-200 disabled:text-gray-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Registration'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary-base hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
