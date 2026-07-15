// apps/web/app/(authenticated)/projects/[slug]/edit/page.tsx
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  updateProjectRequestSchema,
  type UpdateProjectRequest,
} from '@repo/contracts';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { ApiError, apiUpload, apiDelete, apiPost } from '@/lib/api';
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
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { project, isLoading } = useProject(params.slug);
  const updateProject = useUpdateProject();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  const [technologies, setTechnologies] = useState<MockTechnology[]>([]);
  const [isTechInitialized, setIsTechInitialized] = useState(false);

  // Initialize technologies from the fetched project data
  useEffect(() => {
    if (project?.technologies && !isTechInitialized) {
      setTechnologies(
        project.technologies.map((t) => t.technology as MockTechnology)
      );
      setIsTechInitialized(true);
    }
  }, [project, isTechInitialized]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateProjectRequest>({
    resolver: zodResolver(updateProjectRequestSchema),
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
      // 1. Update basic project details
      await updateProject(project.id, data);

      // 2. Diff and update technologies
      const originalTechIds = new Set(project.technologies.map((t) => t.technologyId));
      const currentTechIds = new Set(technologies.map((t) => t.id));

      const techsToAdd = technologies.filter((t) => !originalTechIds.has(t.id));
      const techsToRemove = project.technologies.filter(
        (t) => !currentTechIds.has(t.technologyId)
      );

      // Add new technologies
      for (const tech of techsToAdd) {
        await apiPost(`/projects/${project.id}/technologies`, {
          technologyId: tech.id,
          isPrimary: false,
        });
      }

      // Remove unselected technologies
      for (const tech of techsToRemove) {
        await apiDelete(`/projects/${project.id}/technologies/${tech.technologyId}`);
      }

      toast.success('Project updated successfully');
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
            : 'Unable to update project'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', 'IMAGE');
      formData.append('sortOrder', '0');

      await apiUpload(`/projects/${project.id}/media`, formData);
      toast.success('Media uploaded');
      window.location.reload();
    } catch {
      toast.error('Failed to upload media');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!project) return;
    try {
      await apiDelete(`/projects/${project.id}/media/${mediaId}`);
      toast.success('Media deleted');
      window.location.reload();
    } catch {
      toast.error('Failed to delete media');
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
            {project.media && project.media.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {project.media.map((m: NonNullable<typeof project.media>[number]) => (
                  <div key={m.id} className="relative group rounded-md border bg-muted overflow-hidden">
                    <img src={m.publicUrl} alt={m.caption || ''} className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m.id)}
                      className="absolute top-2 right-2 px-2 py-1 bg-red-600/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-1.5 py-6 text-center">
                <Input
                  type="file"
                  accept="image/jpeg, image/png, image/webp, image/gif"
                  onChange={handleUploadMedia}
                  disabled={isUploadingMedia}
                  className="max-w-[250px]"
                />
                <p className="text-muted-foreground text-xs mt-2">
                  {isUploadingMedia ? 'Uploading...' : 'Upload screenshots or architecture diagrams.'}
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