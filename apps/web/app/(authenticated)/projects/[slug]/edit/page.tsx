'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, ImageIcon, Loader2, X } from 'lucide-react';
import {
  updateProjectRequestSchema,
  type UpdateProjectRequest,
} from '@repo/contracts';
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useUploadProjectMedia,
  useDeleteProjectMedia,
} from '@/hooks/use-projects';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function EditProjectPage() {
  // Route folder is named [slug] to satisfy Next.js's constraint that
  // sibling dynamic routes under /projects share one param name — the value
  // passed here is actually the project id, not a URL slug.
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { project, isLoading } = useProject(params.slug);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const uploadMedia = useUploadProjectMedia();
  const deleteMedia = useDeleteProjectMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
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

  const handleMediaSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !project || isUploading) return;

    setIsUploading(true);
    try {
      await uploadMedia(project.id, file, { sortOrder: project.media.length });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to upload media',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!project) return;

    setDeletingMediaId(mediaId);
    try {
      await deleteMedia(project.id, mediaId);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to delete media',
      );
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success('Project deleted');
      router.push('/projects');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to delete project',
      );
      setIsDeleting(false);
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
            {project.media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {project.media.map((media) => (
                  <div key={media.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.publicUrl}
                      alt={media.caption ?? project.title}
                      className="aspect-video w-full rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(media.id)}
                      disabled={deletingMediaId === media.id}
                      aria-label="Delete media"
                      className="bg-background/90 text-foreground absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      {deletingMediaId === media.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleMediaSelected}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Card className="cursor-pointer border-dashed">
                <CardContent className="flex flex-col items-center gap-1.5 py-6 text-center">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                  <p className="text-muted-foreground text-xs">
                    {isUploading
                      ? 'Uploading...'
                      : 'Click to upload a screenshot (JPEG, PNG, WEBP, or GIF, up to 5MB)'}
                  </p>
                </CardContent>
              </Card>
            </button>
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

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive text-sm">
                Danger zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete project'
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete &ldquo;{project.title}&rdquo;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the project and all of its
                      screenshots. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteProject}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
