'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { FolderGit2, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-auth';
import { fetcher, ApiError } from '@/lib/api';
import { SaveCandidateButton } from '@/components/save-candidate-button';
import { BackLink } from '@/components/back-link';
import type {
  ExploreUsersResponse,
  ExploreProjectsResponse,
} from '@repo/contracts';

// media and technologies now ship natively on this contract type
type PortfolioProject = ExploreProjectsResponse['data'][number];

const THUMB_GRADIENTS = [
  'from-primary-base to-accent',
  'from-purple to-accent',
  'from-orange to-accent',
];

export default function UserPortfolioPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser, isLoading: isAuthLoading } = useUser();

  // Role Guard: Redirect standard developers to dashboard
  useEffect(() => {
    if (
      !isAuthLoading &&
      currentUser &&
      currentUser.accountType !== 'HIRING' &&
      currentUser.accountType !== 'SUPER_ADMIN'
    ) {
      router.replace('/dashboard');
    }
  }, [currentUser, isAuthLoading, router]);

  const isAuthorized =
    currentUser?.accountType === 'HIRING' ||
    currentUser?.accountType === 'SUPER_ADMIN';

  const { data: targetUser, isLoading: isUserLoading } = useSWR<
    ExploreUsersResponse['data'][number],
    ApiError
  >(isAuthorized ? `/users/slug/${slug}` : null, fetcher);

  const { data: projectsResponse, isLoading: isProjectsLoading } = useSWR<
    ExploreProjectsResponse,
    ApiError
  >(
    targetUser?.id && isAuthorized
      ? `/projects/explore?userId=${targetUser.id}`
      : null,
    fetcher,
  );

  if (isAuthLoading || (isAuthorized && isUserLoading)) {
    return (
      <div className="container mx-auto py-12 max-w-6xl space-y-12">
        <div className="flex gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="h-24 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentUser || !isAuthorized) {
    return null;
  }

  if (!targetUser || !targetUser.developerProfile) {
    return <div className="text-center py-24 font-medium">User not found.</div>;
  }

  const profile = targetUser.developerProfile;

  // 3. Cast the response to our typed PortfolioProject array
  const projects = (projectsResponse?.data as PortfolioProject[]) || [];

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const titleMatches = project.title?.toLowerCase().includes(query);
    const descMatches = project.shortDescription?.toLowerCase().includes(query);

    // 4. `project.technologies` is a flat array of `TechnologyResponse`
    const techMatches = project.technologies?.some((tech) =>
      tech.name?.toLowerCase().includes(query),
    );

    return titleMatches || descMatches || techMatches;
  });

  return (
    <div className="container mx-auto py-12 max-w-6xl space-y-16">
      <div className="px-4">
        <BackLink fallbackHref="/users" fallbackLabel="Developers" />
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 px-4">
        <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-background shadow-md flex-shrink-0">
          <AvatarImage
            src={profile.profilePictureUrl || ''}
            alt={profile.displayName || 'Unknown Developer'}
          />
          <AvatarFallback className="text-5xl">
            {profile.displayName?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left pt-2">
          <h1 className="text-4xl font-bold text-foreground">
            {profile.displayName || 'Unknown Developer'}
          </h1>
          <p className="text-xl text-primary font-medium mt-1">
            {profile.headline || 'Software Developer'}
          </p>

          {profile.bio && (
            <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
              {profile.bio}
            </p>
          )}

          {isAuthorized && (
            <div className="mt-6">
              <SaveCandidateButton
                candidateId={targetUser.id}
                variant="default"
                size="lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* PROJECTS SECTION */}
      <div className="space-y-6 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-4">
          <h2 className="text-2xl font-bold">Portfolio Projects</h2>
          {projects.length > 0 && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        {isProjectsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center shadow-none">
            <FolderGit2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No public projects</p>
            <p className="text-sm text-muted-foreground">
              This developer hasn&apos;t published any projects yet.
            </p>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center shadow-none">
            <Search className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="font-medium">No matching projects found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => {
              const cover = project.media?.[0];

              return (
                <Card
                  key={project.id}
                  className="group relative flex flex-col overflow-hidden py-0 hover:shadow-md transition-shadow"
                >
                  <Link
                    href={`/projects/${project.slug}`}
                    className="flex flex-1 flex-col"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={cover.publicUrl}
                          alt={cover.caption ?? project.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className={`h-full bg-gradient-to-br transition-[filter] duration-200 group-hover:brightness-110 ${THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]}`}
                        />
                      )}
                    </div>
                    <div className="flex flex-1 gap-3 px-4 pt-4 pb-5">
                      {project.logoUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={project.logoUrl}
                          alt={`${project.title} logo`}
                          className="h-12 w-12 flex-shrink-0 rounded-lg border object-cover shadow-sm"
                        />
                      )}
                      <div className="flex flex-1 flex-col gap-1.5">
                        <p className="text-base font-semibold group-hover:text-primary transition-colors">
                          {project.title}
                        </p>
                        {project.shortDescription && (
                          <p className="line-clamp-2 text-muted-foreground text-sm">
                            {project.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
