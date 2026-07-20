'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderGit2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { ProjectListCard } from '@/components/project-list-card';
import { useProjects } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';
import type { ProjectScope } from '@repo/contracts';
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
  const [scope, setScope] = useState<ProjectScope>('ALL');
  const [page, setPage] = useState(1);
  const { projects, meta, isLoading, error } = useProjects({
    scope,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = meta?.totalPages ?? 0;
  const currentPage = meta?.currentPage ?? page;

  const changeScope = (nextScope: ProjectScope) => {
    setScope(nextScope);
    setPage(1);
  };

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

      <div
        className="inline-flex rounded-lg border bg-muted/30 p-1"
        role="group"
        aria-label="Project scope"
      >
        {(['ALL', 'OWNED', 'COLLABORATIONS'] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={scope === value ? 'default' : 'ghost'}
            aria-pressed={scope === value}
            onClick={() => changeScope(value)}
          >
            {value === 'ALL'
              ? 'All'
              : value === 'OWNED'
                ? 'Own'
                : 'Collaborations'}
          </Button>
        ))}
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
            {scope === 'COLLABORATIONS'
              ? 'You have no collaboration projects yet.'
              : scope === 'OWNED'
                ? 'You have not imported any projects yet.'
                : 'Link a repository or accept an invitation to get started.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectListCard
                key={project.id}
                index={index}
                project={{
                  id: project.id,
                  title: project.title,
                  shortDescription: project.shortDescription,
                  logoUrl: project.logoUrl,
                  coverImageUrl: project.media[0]?.publicUrl ?? null,
                  status: project.status,
                  role: project.access.currentUserRole,
                  deploymentUrl: project.deploymentUrl,
                }}
                href={`/projects/preview/${project.id}`}
                editHref={
                  project.access.capabilities.canEditContent
                    ? `/projects/${project.id}/edit`
                    : undefined
                }
                publicHref={
                  project.status === 'PUBLISHED'
                    ? `/projects/${project.slug}`
                    : undefined
                }
              />
            ))}
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
