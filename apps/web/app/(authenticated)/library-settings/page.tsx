'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { SlidersHorizontal } from 'lucide-react';

import { organizationUpdateRequestSchema } from '@repo/contracts';
import type { OrganizationUpdateRequest } from '@repo/contracts';
import { useLibrarySettings } from '@/hooks/use-library-settings';
import { useImageUpload } from '@/hooks/use-image-upload';
import { ApiError } from '@/lib/api';
import { RequireRole } from '@/components/require-role';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export default function LibrarySettingsPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN']}
      forbiddenMessage="Only library admins can edit library settings."
    >
      <LibrarySettings />
    </RequireRole>
  );
}

function LibrarySettings() {
  const { organization, isLoading, error, update } = useLibrarySettings();

  const form = useForm<OrganizationUpdateRequest>({
    resolver: zodResolver(organizationUpdateRequestSchema),
    defaultValues: {
      name: '',
      slug: '',
      website: '',
      logoUrl: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!organization) return;
    form.reset({
      name: organization.name,
      slug: organization.slug,
      website: organization.website ?? '',
      logoUrl: organization.logoUrl ?? '',
      description: organization.description ?? '',
    });
  }, [organization, form]);

  const logoUrl = form.watch('logoUrl');
  const name = form.watch('name');

  const { upload, isUploading } = useImageUpload();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await upload(file);
      form.setValue('logoUrl', url, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to upload logo',
      );
    }
  };

  const onSubmit = async (values: OrganizationUpdateRequest) => {
    try {
      await update({
        name: values.name?.trim(),
        slug: values.slug?.trim(),
        website: values.website?.trim() || undefined,
        logoUrl: values.logoUrl?.trim() || undefined,
        description: values.description?.trim() || undefined,
      });
      toast.success('Library settings saved');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save settings',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="py-10 text-center text-error">
        Failed to load library settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Library settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your library&apos;s name, URL, and branding
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Profile & branding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
              <AvatarImage src={logoUrl || undefined} alt="Library logo" />
              <AvatarFallback className="rounded-lg bg-library-primary-100 text-xl text-library-primary-900">
                {(name || organization.name).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFileChange}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                {isUploading
                  ? 'Uploading...'
                  : logoUrl
                    ? 'Replace logo'
                    : 'Upload logo'}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    form.setValue('logoUrl', '', { shouldDirty: true })
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Library name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Your library&apos;s URL identity (lowercase, hyphenated).
                      Must be unique across NextShelf.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://…"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="A short description of your library…"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
