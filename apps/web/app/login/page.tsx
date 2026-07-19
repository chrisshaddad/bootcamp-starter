'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
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
  const [sentEmail, setSentEmail] = useState<string | null>(null);

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
      setSentEmail(data.email);
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
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/images/background-medilink.png"
          alt=""
          fill
          className="object-cover object-left"
          priority
        />

        {/* Gradient overlay: light = white fade (image is light/airy), dark = background-color fade */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/15 to-transparent dark:from-background/75 dark:via-background/55 dark:to-background/25" />

        {/* Logo (top) */}
        <div className="relative flex items-center gap-2.5 px-12.5 pt-10">
          <div className="h-6 w-6 rounded-md bg-primary-base dark:bg-primary-300" />
          <span className="text-xl font-semibold text-foreground">
            MediLink
          </span>
        </div>

        {/* Headline (bottom) */}
        <div className="relative flex flex-col gap-6 px-12.5 pb-15">
          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-foreground">
            Coordinated care records, one institution at a time.
          </h1>
          <p className="text-lg leading-normal text-muted-foreground">
            Secure, passwordless access for your care team.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        {/* Form Section */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {sentEmail ? (
            <div className="flex w-full max-w-120 flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-300/20">
                <MailCheck className="h-7 w-7 text-primary-base dark:text-primary-300" />
              </div>
              <h2 className="text-2xl font-bold leading-[1.3] text-foreground">
                Check your email
              </h2>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to <strong>{sentEmail}</strong>. Open it
                on this device to sign in — you can close this tab now.
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setSentEmail(null)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <div className="flex w-full max-w-120 flex-col items-center gap-8">
              {/* Title */}
              <div className="flex w-full flex-col items-center gap-1.5 text-center">
                <h2 className="text-2xl font-bold leading-[1.3] text-foreground">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in with your work email to continue.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-78.75 space-y-6"
              >
                <div className="flex flex-col gap-2.5">
                  <Label
                    htmlFor="email"
                    className="flex gap-0.5 text-sm font-medium leading-[1.6] text-foreground"
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
                    <p className="text-sm text-error">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-[10px] bg-primary text-base font-bold leading-normal tracking-[0.3px] text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
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
              <p className="text-center text-sm font-medium leading-[1.6] text-muted-foreground">
                We&apos;ll email you a secure link to sign in.
                <br />
                No password needed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium leading-[1.6]">
            <span className="text-muted-foreground">
              © {new Date().getFullYear()} MediLink. All rights reserved.
            </span>
            <a
              href="/terms"
              className="text-foreground hover:text-primary-base hover:underline"
            >
              Terms & Conditions
            </a>
            <a
              href="/privacy"
              className="text-foreground hover:text-primary-base hover:underline"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
