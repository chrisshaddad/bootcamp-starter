'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Compass,
  ExternalLink,
  Github,
  ArrowRight,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import { useExploreProjects } from '@/hooks/use-projects';
import { useTechnologies } from '@/hooks/use-technologies';
import { ApiError } from '@/lib/api';
import {
  getCoverGradient,
  getAccentColor,
  getTechColor,
  getInitials,
} from '@/lib/explore-visuals';
import type { ExploreProjectResponse } from '@repo/contracts';

const MAX_VISIBLE_TECH = 4;
const MAX_VISIBLE_CONTRIBUTORS = 3;

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-80 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: ExploreProjectResponse }) {
  const cover = getCoverGradient(project.id);
  const accent = getAccentColor(project.id);
  const visibleTech = project.technologies.slice(0, MAX_VISIBLE_TECH);
  const hiddenTechCount = project.technologies.length - visibleTech.length;
  const creator = project.createdBy;
  const hasCollaborators = project.contributorCount > 1;

  return (
    <Card className="group gap-0 overflow-hidden rounded-2xl border p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
      <Link href={`/projects/${project.slug}`} className="flex flex-1 flex-col">
        <div
          className="relative flex h-28 items-end p-3"
          style={{ background: cover }}
        >
          <span className="bg-success/20 text-success absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
            {project.status === 'PUBLISHED' ? 'Published' : project.status}
          </span>
          {project.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logoUrl}
              alt={`${project.title} logo`}
              className="border-card h-10 w-10 rounded-lg border-2 object-cover shadow-md"
            />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-extrabold text-white shadow-md"
              style={{ backgroundColor: accent }}
            >
              {getInitials(project.title)}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-1">
          <p className="line-clamp-1 text-[15px] font-extrabold tracking-tight">
            {project.title}
          </p>
          {project.shortDescription && (
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {project.shortDescription}
            </p>
          )}

          {creator && (
            <div className="mt-0.5 flex items-center gap-2">
              <Avatar size="sm">
                <AvatarImage src={creator.profilePictureUrl ?? undefined} />
                <AvatarFallback
                  className="text-[9.5px] font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {getInitials(creator.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold">{creator.displayName}</span>
              {(creator.headline || creator.githubUsername) && (
                <>
                  <span className="text-muted-foreground">&middot;</span>
                  <span className="text-muted-foreground truncate text-[11px]">
                    {creator.headline ?? `@${creator.githubUsername}`}
                  </span>
                </>
              )}
            </div>
          )}

          {visibleTech.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              {visibleTech.map((tech) => (
                <span
                  key={tech.id}
                  className="bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: getTechColor(tech.slug) }}
                  />
                  {tech.name}
                </span>
              ))}
              {hiddenTechCount > 0 && (
                <span className="text-muted-foreground inline-flex items-center rounded-full border border-dashed px-2.5 py-1 text-[10.5px] font-bold">
                  +{hiddenTechCount}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between border-t px-4 py-2.5">
        <div className="text-muted-foreground flex items-center gap-1">
          {project.deploymentUrl && (
            <a
              href={project.deploymentUrl}
              target="_blank"
              rel="noreferrer"
              title="Live demo"
              className="hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {project.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              title="GitHub repository"
              className="hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {hasCollaborators ? (
          <div
            className="flex items-center"
            title={`${project.contributorCount} people worked on this project`}
          >
            <AvatarGroup>
              {project.contributors
                .slice(0, MAX_VISIBLE_CONTRIBUTORS)
                .map((contributor) => (
                  <Avatar key={contributor.id} size="sm">
                    <AvatarImage
                      src={contributor.profilePictureUrl ?? undefined}
                    />
                    <AvatarFallback
                      className="text-[8.5px] font-bold text-white"
                      style={{
                        backgroundColor: getAccentColor(contributor.id),
                      }}
                    >
                      {getInitials(contributor.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              {project.contributorCount > MAX_VISIBLE_CONTRIBUTORS && (
                <AvatarGroupCount className="size-6 text-[8.5px]">
                  +{project.contributorCount - MAX_VISIBLE_CONTRIBUTORS}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          </div>
        ) : (
          <Link
            href={`/projects/${project.slug}`}
            className="text-primary hover:bg-accent inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold"
          >
            View project
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </Card>
  );
}

export default function ExplorePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [technology, setTechnology] = useState('all');
  const [sort, setSort] = useState<'latest' | 'oldest' | 'alphabetical'>(
    'latest',
  );

  const { technologies } = useTechnologies();
  const { projects, meta, isLoading, error } = useExploreProjects({
    page,
    limit: 6,
    search: search || undefined,
    sort,
    technology: technology !== 'all' ? technology : undefined,
  });

  const activeTechnology = technologies?.find((t) => t.slug === technology);
  const hasActiveFilters = Boolean(search) || technology !== 'all';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setTechnology('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Browse Projects</h1>
      </div>

      {/* Search, technology filter, and sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search projects or technologies..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </form>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={technology}
            onValueChange={(value) => {
              setTechnology(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All technologies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technologies</SelectItem>
              {technologies?.map((tech) => (
                <SelectItem key={tech.id} value={tech.slug}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as 'latest' | 'oldest' | 'alphabetical');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeTechnology && (
            <span className="border-primary bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-xs font-bold">
              {activeTechnology.name}
              <button
                type="button"
                aria-label="Remove technology filter"
                onClick={() => {
                  setTechnology('all');
                  setPage(1);
                }}
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {search && (
            <span className="border-border bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-xs font-bold">
              &ldquo;{search}&rdquo;
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-muted-foreground text-xs font-bold underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Projects grid */}
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
          <Compass className="text-muted-foreground h-8 w-8" />
          <p className="font-medium">No projects found</p>
          <p className="text-muted-foreground max-w-xs text-sm">
            {hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Be the first to publish a project!'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-between">
              <p className="text-muted-foreground text-sm">
                Page {meta.currentPage} of {meta.totalPages} ({meta.totalItems}{' '}
                total projects)
              </p>
              <Pagination
                page={meta.currentPage}
                totalPages={meta.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
