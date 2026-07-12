'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, ImageIcon, Loader2 } from 'lucide-react';
import {
  updateProjectRequestSchema,
  type UpdateProjectRequest,
} from '@repo/contracts';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';
import type { MockTechnology } from '@/lib/mock-projects';
import { TechPicker } from '@/components/tech-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function EditProjectPage() {
  // Route folder is named [slug] to satisfy Next.js's constraint that
  // sibling dynamic routes under /projects share one param name — the value
  // passed here is actually the project id, not a URL slug.
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { project, isLoading } = useProject(params.slug);
  const updateProject = useUpdateProject();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [technologies, setTechnologies] = useState<MockTechnology[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateProjectRequest>({
    resolver: zodResolver(updateProjectRequestSchema),
    // `values` (not a one-time `reset()` in an effect) keeps the form in
    // sync with `project` from the very first render — using `reset()`
    // here left the Radix Select mounting one tick with an undefined
    // value, which made it get stuck displaying blank.
    values: project
      ? {
          title: project.title,
          slug: project.slug,
          shortDescription: project.shortDescription,
          fullDescription: project.fullDescription,
          deploymentUrl: project.deploymentUrl,
          status: project.status,
        }
      : undefined,
  });

  const onSubmit = async (data: UpdateProjectRequest) => {
    if (!project) return;

    setIsSubmitting(true);
    try {
      await updateProject(project.id, data);
      toast.success('Project updated');
      router.push('/projects');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('You do not have permission to edit this project');
      } else if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message);
      } else {
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'Unable to update project',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link
          href="/projects"
          className="text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <p className="text-muted-foreground text-sm">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      <div>
        <h1 className="text-foreground text-2xl font-bold">Edit project</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                aria-invalid={!!errors.title}
                {...register('title')}
              />
              {errors.title && (
                <p className="text-destructive text-sm">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                aria-invalid={!!errors.slug}
                {...register('slug')}
              />
              {errors.slug && (
                <p className="text-destructive text-sm">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea id="shortDescription" {...register('shortDescription')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullDescription">Full description</Label>
            <Textarea
              id="fullDescription"
              className="min-h-32"
              {...register('fullDescription')}
            />
          </div>

          <div className="space-y-2">
            <Label>Media</Label>
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-1.5 py-6 text-center">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  Screenshot/video upload isn&apos;t available yet —
                  ProjectMedia has no endpoint.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <Label>Tech stack</Label>
            <TechPicker selected={technologies} onChange={setTechnologies} />
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deploymentUrl">Deployment URL</Label>
                <Input
                  id="deploymentUrl"
                  type="url"
                  aria-invalid={!!errors.deploymentUrl}
                  {...register('deploymentUrl')}
                />
                {errors.deploymentUrl && (
                  <p className="text-destructive text-sm">
                    {errors.deploymentUrl.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
