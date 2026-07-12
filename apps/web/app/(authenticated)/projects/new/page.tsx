'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, Github, ImageIcon, Loader2, Search, X } from 'lucide-react';
import {
  createProjectRequestSchema,
  type CreateProjectRequest,
  type GithubRepositoryPreviewResponse,
} from '@repo/contracts';
import { useCreateProject, useUploadProjectMedia } from '@/hooks/use-projects';
import { apiPost, ApiError } from '@/lib/api';
import {
  KNOWN_SEEDED_REPOSITORIES,
  type MockTechnology,
} from '@/lib/mock-projects';
import { TechPicker } from '@/components/tech-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface PendingMedia {
  file: File;
  previewUrl: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const uploadMedia = useUploadProjectMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks every blob URL ever created for pendingMedia previews, so they
  // can all be revoked on unmount (covers both the post-submit redirect and
  // navigating away without submitting) — not just on manual removal.
  const objectUrlsRef = useRef<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  // mock: no Technology/ProjectTechnology endpoint yet — selections here are
  // local-only, not sent on submit.
  const [technologies, setTechnologies] = useState<MockTechnology[]>([]);

  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [preview, setPreview] =
    useState<GithubRepositoryPreviewResponse | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProjectRequest>({
    resolver: zodResolver(createProjectRequestSchema),
    defaultValues: { status: 'DRAFT' },
  });

  useEffect(() => {
    return () => {
      // Not a DOM ref — it's a plain mutable array we push to as files are
      // picked, so reading .current at cleanup time (not capturing it here)
      // is exactly what we want: revoke whatever was accumulated by unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const title = watch('title');

  const onSubmit = async (data: CreateProjectRequest) => {
    setIsSubmitting(true);
    try {
      const project = await createProject(data);

      if (pendingMedia.length > 0) {
        const results = await Promise.allSettled(
          pendingMedia.map((pending, index) =>
            uploadMedia(project.id, pending.file, { sortOrder: index }),
          ),
        );
        const failedCount = results.filter(
          (r) => r.status === 'rejected',
        ).length;
        if (failedCount > 0) {
          toast.error(
            `Project created, but ${failedCount} screenshot${failedCount > 1 ? 's' : ''} failed to upload — you can retry from the edit page.`,
          );
        }
      }

      toast.success('Project created');
      router.push(`/projects/${project.id}/edit`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        toast.error('Repository not found — check the repository ID');
      } else if (error instanceof ApiError && error.status === 403) {
        // 403 covers two distinct causes (no GitHub account connected vs.
        // not the repository owner) — show the server's actual message
        // instead of a single hardcoded "you don't own it" string.
        toast.error(error.message);
      } else if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message);
      } else {
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'Unable to create project',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // real: calls the GitHub preview foundation endpoint (POST
  // /github/repositories/preview). It only reads live data from GitHub for
  // display/autofill — it doesn't create a Repository row or prove
  // ownership, so the Repository ID field below still has to be filled in
  // manually until a real import endpoint exists.
  const handleFetchPreview = async () => {
    setIsFetchingPreview(true);
    try {
      const data = await apiPost<GithubRepositoryPreviewResponse>(
        '/github/repositories/preview',
        { repositoryUrl },
      );
      setPreview(data);

      if (data.repository.description) {
        setValue('shortDescription', data.repository.description, {
          shouldValidate: true,
        });
      }

      // real: GitHub's actual reported languages for this repo — used
      // directly as tags rather than matched against the fixed mock
      // technology list, which only covers 7 stack items and would miss
      // almost everything a real repo reports (e.g. EJS, CSS, Ruby).
      const fetchedTechnologies: MockTechnology[] = data.languages
        .slice()
        .sort((a, b) => b.bytes - a.bytes)
        .map((lang) => ({
          id: `github-lang-${slugify(lang.name)}`,
          name: lang.name,
          slug: slugify(lang.name),
          category: 'LANGUAGE',
        }));

      if (fetchedTechnologies.length > 0) {
        setTechnologies(fetchedTechnologies);
      }
    } catch (error) {
      setPreview(null);
      if (error instanceof ApiError && error.status === 400) {
        toast.error('Invalid GitHub repository URL');
      } else if (error instanceof ApiError && error.status === 404) {
        toast.error('Repository not found, private, or inaccessible');
      } else {
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'Unable to fetch repository preview',
        );
      }
    } finally {
      setIsFetchingPreview(false);
    }
  };

  // Screenshots can't upload until the project exists (POST /projects/:id/
  // media needs an id), so files are staged locally and uploaded right
  // after creation succeeds, in the same submit — see onSubmit above.
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const newPending = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    objectUrlsRef.current.push(...newPending.map((p) => p.previewUrl));
    setPendingMedia((prev) => [...prev, ...newPending]);
  };

  const handleRemovePending = (index: number) => {
    setPendingMedia((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

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
        <h1 className="text-foreground text-2xl font-bold">Add project</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Link a repository and fill in what recruiters will see on its page.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="repositoryUrl">GitHub repository URL</Label>
            <div className="flex gap-2">
              <Input
                id="repositoryUrl"
                placeholder="https://github.com/owner/repo"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchPreview}
                disabled={!repositoryUrl || isFetchingPreview}
              >
                {isFetchingPreview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Fetch
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Pulls the description and languages from GitHub to help fill out
              the form below. This is a preview only — it doesn&apos;t prove
              ownership or link the repository, so you still need to paste the
              matching Repository ID manually until repo import ships.
            </p>
          </div>

          {preview && (
            <Card>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <Github className="h-3.5 w-3.5" />
                    {preview.repository.fullName}
                  </p>
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                    {preview.repository.visibility}
                  </span>
                </div>
                {preview.repository.description && (
                  <p className="text-muted-foreground text-xs">
                    {preview.repository.description}
                  </p>
                )}
                {preview.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {preview.languages.map((lang) => (
                      <span
                        key={lang.name}
                        className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
                      >
                        {lang.name}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="repositoryId">Repository ID</Label>
            <Input
              id="repositoryId"
              placeholder="Repository UUID"
              aria-invalid={!!errors.repositoryId}
              {...register('repositoryId')}
            />
            {errors.repositoryId && (
              <p className="text-destructive text-sm">
                {errors.repositoryId.message}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              No repository picker yet (GitHub linking isn&apos;t built) — paste
              a Repository row&apos;s id, e.g. from{' '}
              <code className="rounded bg-muted px-1 py-0.5">
                npx prisma studio
              </code>
              . Seeded options:{' '}
              {KNOWN_SEEDED_REPOSITORIES.map((r) => r.fullName).join(', ')}.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                aria-invalid={!!errors.title}
                {...register('title', {
                  onChange: (e) => {
                    const current = e.target.value;
                    setValue('slug', slugify(current), {
                      shouldValidate: true,
                    });
                  },
                })}
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
            <Textarea
              id="shortDescription"
              placeholder="One sentence — shows on the project card"
              {...register('shortDescription')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullDescription">Full description</Label>
            <Textarea
              id="fullDescription"
              placeholder="Shown in full on the project's public page"
              className="min-h-32"
              {...register('fullDescription')}
            />
          </div>

          <div className="space-y-2">
            <Label>Media</Label>
            {pendingMedia.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {pendingMedia.map((pending, index) => (
                  <div key={pending.previewUrl} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pending.previewUrl}
                      alt={pending.file.name}
                      className="aspect-video w-full rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePending(index)}
                      aria-label="Remove screenshot"
                      className="bg-background/90 text-foreground absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left"
            >
              <Card className="cursor-pointer border-dashed">
                <CardContent className="flex flex-col items-center gap-1.5 py-6 text-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs">
                    Click to add screenshots (JPEG, PNG, WEBP, or GIF, up to 5MB
                    each) — uploaded once you create the project
                  </p>
                </CardContent>
              </Card>
            </button>
          </div>

          <div className="space-y-2">
            <Label>Tech stack</Label>
            <TechPicker
              selected={technologies}
              onChange={setTechnologies}
              suggestions={preview ? [] : undefined}
            />
            {preview && (
              <p className="text-muted-foreground text-xs">
                Showing languages fetched from GitHub. Remove a tag by clicking
                it — there&apos;s no fixture suggestion list here since it
                wouldn&apos;t reflect this repository.
              </p>
            )}
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
                  placeholder="https://your-app.com"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold">
                {title || 'Project title'}
              </p>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                {watch('shortDescription') ||
                  'Short description will show here'}
              </p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create project'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
