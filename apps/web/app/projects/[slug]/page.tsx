'use client';

import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectBySlug } from '@/hooks/use-projects';
import { ProjectShowcase } from '@/components/project-showcase';

// mock: SavedProject has no endpoint yet.
function handleSave() {
  toast.info('Saving projects is not connected to the backend yet.');
}

export default function ProjectShowcasePage() {
  const params = useParams<{ slug: string }>();
  const { project, error, isLoading } = useProjectBySlug(params.slug);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(47,120,238,0.25),transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error || !project ? (
            <div className="py-20 text-center">
              <p className="text-foreground text-lg font-semibold">
                Project not found
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                It may be unpublished, or the link is incorrect.
              </p>
            </div>
          ) : (
            <ProjectShowcase project={project} onSave={handleSave} />
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
