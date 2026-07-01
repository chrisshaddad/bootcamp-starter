'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { magicLinkRequestSchema, type MagicLinkRequest } from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
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
    <div className="flex min-h-screen bg-library-paper">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 bg-library-ink lg:flex lg:flex-col lg:justify-end">
        {/* Background Image */}
        <div className="relative flex-1">
          <Image
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80"
            alt="Library bookshelves"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Content Section with green top border */}
        <div className="flex flex-col gap-6 border-t-[5px] border-library-accent bg-library-ink px-12.5 pb-15 pt-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image
              src="/nextshelf-icon.svg"
              alt="NextShelf"
              width={32}
              height={32}
              priority
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-white">NextShelf</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Every book, every borrower, back on the shelf.
          </h1>

          {/* Subtext */}
          <p className="text-lg leading-normal text-white">
            Sign in to manage your catalog, members, and loans in one place — or register your library to bring your whole collection online.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        {/* Form Section */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-120 flex-col items-center gap-8">
            {/* Title */}
            <h2 className="w-full text-center text-2xl font-bold leading-[1.3] text-library-ink">
              Login first to your account
            </h2>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="w-78.75 space-y-6"
            >
              <div className="flex flex-col gap-2.5">
                <Label
                  htmlFor="email"
                  className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                >
                  <span>Email Address</span>
                  <span className="text-error">*</span>
                </Label>
                <Input
                  id="email"
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
                className="h-14 w-full rounded-[10px] bg-library-primary text-base font-bold leading-normal tracking-[0.3px] text-white hover:bg-library-ink disabled:bg-gray-200 disabled:text-gray-500"
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
            </form>

            {/* Info Text */}
            <p className="text-center text-sm font-medium leading-[1.6] text-gray-500">
              We&apos;ll send you a magic link to sign in instantly.
              <br />
              No password required.
            </p>

            {/* Register Link */}
            <p className="text-center text-sm font-medium leading-[1.6]">
              <span className="text-gray-500">
                Don&apos;t have a organization?{' '}
              </span>
              <a href="/register" className="text-library-primary hover:underline">
                Create an Org
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium leading-[1.6]">
            <span className="text-gray-500">
              © {new Date().getFullYear()} NextShelf. All rights
              reserved.
            </span>
            <a
              href="/terms"
              className="text-library-ink hover:text-library-primary hover:underline"
            >
              Terms & Conditions
            </a>
            <a
              href="/privacy"
              className="text-library-ink hover:text-library-primary hover:underline"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
