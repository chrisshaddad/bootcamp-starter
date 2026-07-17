'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Compass,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExploreProjects } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';

const THUMB_GRADIENTS = [
  'from-primary-base to-accent',
  'from-purple to-accent',
  'from-orange to-accent',
];

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-56 w-full" />
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<'latest' | 'oldest' | 'alphabetical'>(
    'latest',
  );

  const { projects, meta, isLoading, error } = useExploreProjects({
    page,
    limit: 12,
    search: search || undefined,
    sort,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Explore Projects</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Discover community projects and explore work published by other
          developers.
        </p>
      </div>

      {/* Search and Sort Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'latest' | 'oldest' | 'alphabetical');
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
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
          <Compass className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No projects found</p>
          <p className="text-muted-foreground max-w-xs text-sm">
            {search
              ? 'Try adjusting your search filters.'
              : 'Be the first to publish a project!'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => {
              //const cover = project.media?.[0];

              return (
                <Card
                  key={project.id}
                  className="group relative flex flex-col overflow-hidden py-0 shadow-sm hover:border-primary/50 transition-colors"
                >
                  <Link
                    href={`/projects/${project.slug}`}
                    className="flex flex-1 flex-col"
                  >
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
                        <p className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1">
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

                  <div className="mt-3 flex items-center justify-between border-t px-4 py-2.5">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {project.deploymentUrl && (
                        <a
                          href={project.deploymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs hover:text-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Demo
                        </a>
                      )}
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                    >
                      <Link href={`/projects/${project.slug}`}>
                        View project
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {meta.currentPage} of {meta.totalPages} ({meta.totalItems}{' '}
                total projects)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
