'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building2, CheckCircle2, Loader2, Mail, User } from 'lucide-react';
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
      toast.success("Library registered! We'll email you once it's approved.");
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
    <div className="flex min-h-dvh bg-library-paper">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 overflow-hidden bg-library-ink lg:flex lg:flex-col lg:justify-end">
        {/* Background Image + warm duotone wash, so the photo reads as part
            of the brand instead of a stock image dropped on top of it */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80"
            alt="Library bookshelves"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-library-ink from-0% via-library-ink/55 via-45% to-transparent to-90%" />
        </div>

        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 z-1 h-96 w-96 rounded-full bg-library-accent-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-32 z-1 h-72 w-72 rounded-full bg-library-primary-500/25 blur-3xl" />

        {/* Content Section */}
        <div className="relative z-10 flex flex-col gap-6 px-12.5 pb-15 pt-10">
          <div className="h-0.75 w-16 rounded-full bg-linear-to-r from-library-accent-300 to-library-accent-600" />

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

          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Bring your whole library online.
          </h1>

          <p className="text-lg leading-normal text-white/85">
            Register your library to manage your catalog, members, and loans in
            one place. We&apos;ll email you a sign-in link once a NextShelf
            administrator approves it.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="relative flex w-full flex-col justify-between bg-linear-to-br from-library-paper via-library-primary-50 to-library-accent-50 lg:w-1/2">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {result ? (
            <div className="w-full max-w-120 rounded-3xl border border-library-primary-100 bg-white/80 p-8 shadow-xl shadow-library-primary-900/5 backdrop-blur-sm sm:p-10">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-success to-success-dark shadow-lg shadow-success/30">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold leading-[1.3] text-library-ink">
                  Registration received
                </h2>
                <p className="text-base leading-normal text-muted-foreground">
                  <span className="font-semibold text-library-ink">
                    {result.name}
                  </span>{' '}
                  is pending approval by a NextShelf administrator before it
                  goes live.
                </p>
                <p className="text-sm leading-[1.6] text-muted-foreground">
                  Once it&apos;s approved we&apos;ll email{' '}
                  <span className="font-semibold text-library-ink">
                    {result.adminEmail}
                  </span>{' '}
                  a link to sign in. There&apos;s nothing you need to do in the
                  meantime.
                </p>
                <a
                  href="/login"
                  className="text-sm font-semibold text-library-primary hover:underline"
                >
                  Back to login
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-120 rounded-3xl border border-library-primary-100 bg-white/80 p-8 shadow-xl shadow-library-primary-900/5 backdrop-blur-sm sm:p-10">
              <div className="flex flex-col items-center gap-8">
                {/* Icon badge */}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-library-primary-400 to-library-accent-500 shadow-lg shadow-library-primary-500/30">
                  <Building2 className="h-6 w-6 text-white" />
                </div>

                <div className="flex flex-col items-center gap-1.5 text-center">
                  <h2 className="text-2xl font-bold leading-[1.3] text-library-ink">
                    Register your library
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    A NextShelf administrator reviews every new library before
                    it goes live.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="w-full space-y-5"
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
                      <p className="text-sm text-error">
                        {errors.name.message}
                      </p>
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
                      <p className="text-sm text-error">
                        {errors.slug.message}
                      </p>
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
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-library-primary-400" />
                      <Input
                        id="adminName"
                        placeholder="Chris Haddad"
                        aria-invalid={!!errors.adminName}
                        className="pl-12"
                        {...register('adminName')}
                      />
                    </div>
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
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-library-primary-400" />
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="you@library.org"
                        aria-invalid={!!errors.adminEmail}
                        className="pl-12"
                        {...register('adminEmail')}
                      />
                    </div>
                    {errors.adminEmail && (
                      <p className="text-sm text-error">
                        {errors.adminEmail.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="h-14 w-full rounded-[10px] bg-linear-to-r from-library-primary-500 to-library-primary-600 text-base font-bold leading-normal tracking-[0.3px] text-white shadow-lg shadow-library-primary-500/25 transition hover:-translate-y-0.5 hover:from-library-primary-600 hover:to-library-primary-700 hover:shadow-xl hover:shadow-library-primary-500/30 disabled:translate-y-0 disabled:bg-gray-200 disabled:text-muted-foreground disabled:shadow-none"
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
                    className="font-semibold text-library-primary hover:underline"
                  >
                    Sign in
                  </a>
                </p>
              </div>
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
              href="/signup"
              className="text-library-ink hover:text-library-primary hover:underline"
            >
              Register a patron account
            </a>
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
