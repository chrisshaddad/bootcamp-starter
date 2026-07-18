'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useProject } from '@/hooks/use-projects';
import { ProjectShowcase } from '@/components/project-showcase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectPreviewPage() {
  // Route folder is named [slug] to satisfy Next.js's constraint that
  // sibling dynamic routes under /projects share one param name — the value
  // passed here is actually the project id, not a URL slug.
  const params = useParams<{ slug: string }>();
  const { project, error, isLoading } = useProject(params.slug);

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          href="/projects"
          className="text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        {project?.access.capabilities.canEditContent && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <div className="mx-auto max-w-5xl rounded-lg border border-dashed px-4 py-2 text-center text-xs text-muted-foreground">
        Preview — this is how the project will look on its public page.
      </div>

      {/* -m-6 cancels the dashboard shell's `p-6` so the gradient bleeds
          edge-to-edge, matching the public page's full-bleed `<main>`. */}
      <div className="relative -m-6 overflow-hidden px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(47,120,238,0.25),transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error || !project ? (
            <p className="text-muted-foreground text-sm">Project not found.</p>
          ) : (
            <ProjectShowcase project={project} />
          )}
        </div>
      </div>
    </div>
  );
}
