'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import {
  createOrganizationRequestSchema,
  type CreateOrganizationRequest,
  type OrganizationRegisterResponse,
} from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost, ApiError } from '@/lib/api';

// Derive a URL-friendly slug from the library name.
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [result, setResult] = useState<OrganizationRegisterResponse | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateOrganizationRequest>({
    resolver: zodResolver(createOrganizationRequestSchema),
    defaultValues: { name: '', slug: '', adminName: '', adminEmail: '' },
  });

  const nameField = register('name');
  const slugField = register('slug');

  const onSubmit = async (data: CreateOrganizationRequest) => {
    setIsSubmitting(true);
    try {
      const registered = await apiPost<OrganizationRegisterResponse>(
        '/organizations',
        data,
      );
      setResult(registered);
      toast.success('Library registered! Check your email to sign in.');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
        // Surface a taken slug inline so the user can pick another.
        if (error.status === 409 && /slug/i.test(error.message)) {
          setError('slug', { message: error.message });
        }
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
        <div className="relative flex-1">
          <Image
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80"
            alt="Library bookshelves"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6 border-t-[5px] border-library-accent bg-library-ink px-12.5 pb-15 pt-10">
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

          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Bring your whole library online.
          </h1>

          <p className="text-lg leading-normal text-white">
            Register your library to manage your catalog, members, and loans in
            one place. We&apos;ll email you a magic link to get started.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {result ? (
            <div className="flex w-full max-w-120 flex-col items-center gap-6 text-center">
              <CheckCircle2 className="h-14 w-14 text-success" />
              <h2 className="text-2xl font-bold leading-[1.3] text-library-ink">
                Check your email
              </h2>
              <p className="text-base leading-normal text-muted-foreground">
                We sent a magic link to{' '}
                <span className="font-semibold text-library-ink">
                  {result.adminEmail}
                </span>
                . Click it to sign in.
              </p>
              <p className="text-sm leading-[1.6] text-muted-foreground">
                <span className="font-semibold text-library-ink">
                  {result.name}
                </span>{' '}
                has been created and is pending approval by a NextShelf
                administrator before it goes live.
              </p>
              <a
                href="/login"
                className="text-sm font-medium text-library-primary hover:underline"
              >
                Back to login
              </a>
            </div>
          ) : (
            <div className="flex w-full max-w-120 flex-col items-center gap-8">
              <h2 className="w-full text-center text-2xl font-bold leading-[1.3] text-library-ink">
                Register your library
              </h2>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-78.75 space-y-5"
              >
                {/* Library name */}
                <div className="flex flex-col gap-2.5">
                  <Label
                    htmlFor="name"
                    className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                  >
                    <span>Library Name</span>
                    <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Central City Library"
                    aria-invalid={!!errors.name}
                    {...nameField}
                    onChange={(e) => {
                      nameField.onChange(e);
                      if (!slugEdited) {
                        setValue('slug', slugify(e.target.value), {
                          shouldValidate: true,
                        });
                      }
                    }}
                  />
                  {errors.name && (
                    <p className="text-sm text-error">{errors.name.message}</p>
                  )}
                </div>

                {/* Slug */}
                <div className="flex flex-col gap-2.5">
                  <Label
                    htmlFor="slug"
                    className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                  >
                    <span>Library URL</span>
                    <span className="text-error">*</span>
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      nextshelf.app/
                    </span>
                    <Input
                      id="slug"
                      placeholder="central-city-library"
                      aria-invalid={!!errors.slug}
                      {...slugField}
                      onChange={(e) => {
                        slugField.onChange(e);
                        setSlugEdited(true);
                      }}
                    />
                  </div>
                  {errors.slug ? (
                    <p className="text-sm text-error">{errors.slug.message}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Lowercase letters, numbers, and hyphens only.
                    </p>
                  )}
                </div>

                {/* Admin name */}
                <div className="flex flex-col gap-2.5">
                  <Label
                    htmlFor="adminName"
                    className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                  >
                    <span>Your Name</span>
                    <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="adminName"
                    placeholder="Chris Haddad"
                    aria-invalid={!!errors.adminName}
                    {...register('adminName')}
                  />
                  {errors.adminName && (
                    <p className="text-sm text-error">
                      {errors.adminName.message}
                    </p>
                  )}
                </div>

                {/* Admin email */}
                <div className="flex flex-col gap-2.5">
                  <Label
                    htmlFor="adminEmail"
                    className="flex gap-0.5 text-sm font-medium leading-[1.6] text-library-ink"
                  >
                    <span>Your Email</span>
                    <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="you@library.org"
                    aria-invalid={!!errors.adminEmail}
                    {...register('adminEmail')}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-error">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-[10px] bg-library-primary text-base font-bold leading-normal tracking-[0.3px] text-white hover:bg-library-ink disabled:bg-gray-200 disabled:text-muted-foreground"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register Library'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm font-medium leading-[1.6]">
                <span className="text-muted-foreground">
                  Already have an account?{' '}
                </span>
                <a
                  href="/login"
                  className="text-library-primary hover:underline"
                >
                  Sign in
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium leading-[1.6]">
            <span className="text-muted-foreground">
              © {new Date().getFullYear()} NextShelf. All rights reserved.
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
