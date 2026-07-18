/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, ImageIcon, Loader2, Star, X } from 'lucide-react';
import {
  updateProjectRequestSchema,
  type UpdateProjectRequest,
} from '@repo/contracts';
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useUploadProjectMedia,
  useSetCoverProjectMedia,
  useDeleteProjectMedia,
  useUploadProjectLogo,
} from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';
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
import { ProjectInvitationsManager } from '@/components/project-invitations-manager';

export default function EditProjectPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { project, isLoading } = useProject(params.slug);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const uploadMedia = useUploadProjectMedia();
  const setCoverMedia = useSetCoverProjectMedia();
  const deleteMedia = useDeleteProjectMedia();
  const uploadLogo = useUploadProjectLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [settingCoverMediaId, setSettingCoverMediaId] = useState<string | null>(
    null,
  );

  // project.media changes (and gives `project` a new object reference)
  // independently of these fields — memoizing on the scalars keeps this
  // reference stable across those unrelated updates, so an unrelated
  // mutation doesn't force-reset the whole form (Radix Select included).
  const formValues = useMemo(
    () =>
      project
        ? {
            title: project.title,
            slug: project.slug,
            shortDescription: project.shortDescription,
            fullDescription: project.fullDescription,
            deploymentUrl: project.deploymentUrl,
            status: project.access.capabilities.canPublish
              ? project.status
              : undefined,
          }
        : undefined,
    // Deliberately depending on the scalar fields, not `project` itself —
    // see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      project?.title,
      project?.slug,
      project?.shortDescription,
      project?.fullDescription,
      project?.deploymentUrl,
      project?.status,
      project?.access.capabilities.canPublish,
    ],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateProjectRequest>({
    resolver: zodResolver(updateProjectRequestSchema),
    defaultValues: {
      status: 'DRAFT',
    },
    // `values` (not a one-time `reset()` in an effect) keeps the form in
    // sync with `project` from the very first render — using `reset()`
    // here left the Radix Select mounting one tick with an undefined
    // value, which made it get stuck displaying blank.
    values: formValues,
  });

  const onSubmit = async (data: UpdateProjectRequest) => {
    if (!project) return;
    const allowedData = { ...data };
    if (!project.access.capabilities.canPublish) {
      delete allowedData.status;
    }

    setIsSubmitting(true);
    try {
      await updateProject(project.id, allowedData);

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
      const nextSortOrder =
        Math.max(-1, ...project.media.map((m) => m.sortOrder)) + 1;
      await uploadMedia(project.id, file, { sortOrder: nextSortOrder });
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

  // Card grid shows project.media[0] as the cover, so "use as cover" just
  // needs to make the clicked screenshot sort first. The swap with whichever
  // screenshot currently holds that spot happens server-side in one
  // transaction so a failure or interleaved click can't leave sortOrder
  // inconsistent between the two rows.
  const handleSetCover = async (mediaId: string) => {
    if (!project || settingCoverMediaId) return;
    const current = project.media[0];
    if (!current || current.id === mediaId) return;

    setSettingCoverMediaId(mediaId);
    try {
      await setCoverMedia(project.id, mediaId);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to set cover photo',
      );
    } finally {
      setSettingCoverMediaId(null);
    }
  };

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !project || isUploadingLogo) return;

    setIsUploadingLogo(true);
    try {
      await uploadLogo(project.id, file);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to upload logo',
      );
    } finally {
      setIsUploadingLogo(false);
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

  if (!project.access.capabilities.canEditContent) {
    return (
      <div className="space-y-4">
        <Link
          href={`/projects/${project.id}/preview`}
          className="text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          View project
        </Link>
        <Card className="border-dashed py-12 text-center">
          <CardContent>
            <p className="font-medium">This project is read-only for you.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contributors can view the project but cannot edit it.
            </p>
          </CardContent>
        </Card>
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
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                aria-label={project.logoUrl ? 'Replace logo' : 'Add logo'}
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUploadingLogo ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : project.logoUrl ? (
                  <img
                    src={project.logoUrl}
                    alt="Project logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleLogoSelected}
                className="hidden"
              />
              <p className="text-muted-foreground text-xs">
                Square image works best — shown as a small badge on the project
                card. Click to {project.logoUrl ? 'replace' : 'add'}.
              </p>
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
                {project.media.map((media, index) => {
                  const isCover = index === 0;
                  const isSettingCover = settingCoverMediaId === media.id;

                  return (
                    <div key={media.id} className="group relative">
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
                      {isCover ? (
                        <span className="bg-background/90 text-foreground absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCover(media.id)}
                          disabled={settingCoverMediaId !== null}
                          className="bg-background/90 text-foreground absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
                        >
                          {isSettingCover ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Star className="h-2.5 w-2.5" />
                          )}
                          Use as cover
                        </button>
                      )}
                    </div>
                  );
                })}
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
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.access.capabilities.canPublish && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
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
              )}
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

          {project.access.capabilities.canDelete && (
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
                      <AlertDialogCancel type="button">
                        Cancel
                      </AlertDialogCancel>
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
          )}
        </div>
      </form>

      {project.access.capabilities.canManageInvitations && (
        <ProjectInvitationsManager projectId={project.id} />
      )}
    </div>
  );
}
