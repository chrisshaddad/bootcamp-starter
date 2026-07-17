'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderGit2, ExternalLink, Pencil, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { useProjects } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from '@/lib/project-status';

const THUMB_GRADIENTS = [
  'from-primary-base to-accent',
  'from-purple to-accent',
  'from-orange to-accent',
];

const PAGE_SIZE = 6;

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-56 w-full" />
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, isLoading, error } = useProjects();
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(projects.length / PAGE_SIZE);
  const pageProjects = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Repos you&apos;ve linked and published to your public profile
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            Add project
          </Link>
        </Button>
      </div>

      {error ? (
        <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <p className="font-medium">Unable to load projects</p>
          <p className="text-muted-foreground max-w-xs text-sm">
            {error instanceof ApiError
              ? error.message
              : 'Something went wrong.'}
          </p>
        </Card>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <FolderGit2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No projects yet</p>
          <p className="text-muted-foreground max-w-xs text-sm">
            Link a repository to showcase your work.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageProjects.map((project, index) => {
              const cover = project.media[0];

              return (
                <Card
                  key={project.id}
                  className="group relative flex flex-col overflow-hidden py-0"
                >
                  <Link
                    href={`/projects/${project.id}/edit`}
                    className="absolute top-9 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    href={`/projects/${project.id}/preview`}
                    className="flex flex-1 flex-col"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.publicUrl}
                          alt={cover.caption ?? project.title}
                          className="h-full w-full object-cover transition-[filter] duration-200 group-hover:brightness-95"
                        />
                      ) : (
                        <div
                          className={`h-full bg-gradient-to-br transition-[filter] duration-200 group-hover:brightness-110 ${THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]}`}
                        />
                      )}

                      <span
                        className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${PROJECT_STATUS_COLORS[project.status]}`}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </div>

                    <div className="flex flex-1 gap-3 px-4 pt-3">
                      {project.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.logoUrl}
                          alt={`${project.title} logo`}
                          className="h-12 w-12 flex-shrink-0 rounded-lg border object-cover"
                        />
                      )}
                      <div className="flex flex-1 flex-col gap-2">
                        <p className="text-sm font-semibold hover:text-primary">
                          {project.title}
                        </p>
                        {project.shortDescription && (
                          <p className="line-clamp-2 text-muted-foreground text-xs">
                            {project.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="mt-3 flex items-center gap-3 border-t px-4 py-2.5 text-muted-foreground">
                    {project.deploymentUrl && (
                      <a
                        href={project.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {project.status === 'PUBLISHED' && (
                      <Link
                        href={`/projects/${project.slug}`}
                        className="text-xs hover:text-primary"
                        target="_blank"
                      >
                        View public page
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
