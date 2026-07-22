'use client';

import { useParams } from 'next/navigation';
import { ProjectShowcase } from '@/components/project-showcase';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { BackLink } from '@/components/back-link';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/hooks/use-projects';

export default function ProjectPreviewPage() {
  const params = useParams<{ id: string }>();
  const { project, error, isLoading } = useProject(params.id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(47,120,238,0.25),transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl">
          <BackLink
            fallbackHref="/projects"
            fallbackLabel="Projects"
            requireAuth
            className="mb-6"
          />

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error || !project ? (
            <div className="py-20 text-center">
              <p className="text-foreground text-lg font-semibold">
                Project preview unavailable
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                The project may no longer exist, or you may not have access.
              </p>
            </div>
          ) : (
            <ProjectShowcase project={project} />
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
