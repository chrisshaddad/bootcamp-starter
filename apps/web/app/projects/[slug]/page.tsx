// apps/web/app/projects/[slug]/page.tsx
/* eslint-disable @next/next/no-img-element */
'use client';

import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Github, ExternalLink, Bookmark, ImageIcon } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectBySlug } from '@/hooks/use-projects';
import {
  MOCK_CONTRIBUTORS,
  TECHNOLOGY_CATEGORY_LABELS,
  type TechnologyCategory,
} from '@/lib/mock-projects';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from '@/lib/project-status';

interface ProjectTechItem {
  id: string;
  name: string;
  slug: string;
  category: TechnologyCategory;
}

// mock: SavedProject has no endpoint yet.
function handleSave() {
  toast.info('Saving projects is not connected to the backend yet.');
}

export default function ProjectShowcasePage() {
  const params = useParams<{ slug: string }>();
  const { project, error, isLoading } = useProjectBySlug(params.slug);

  // Safely extract and type the database technologies
  const projectTechs = (project?.technologies ?? [])
    .map((pt) => pt.technology as unknown as ProjectTechItem)
    .filter(Boolean);

  // Accumulate technologies into their respective categories with explicit types
  const technologiesByCategory = projectTechs.reduce(
    (acc: Record<string, ProjectTechItem[]>, tech: ProjectTechItem) => {
      const category = tech.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(tech);
      return acc;
    },
    {} as Record<string, ProjectTechItem[]>,
  );

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
            <>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {project.title}
                    </h1>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${
                        PROJECT_STATUS_COLORS[project.status]
                      }`}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  {project.deploymentUrl && (
                    <Button variant="outline" asChild>
                      <a
                        href={project.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Live demo
                      </a>
                    </Button>
                  )}
                  <Button onClick={handleSave}>
                    <Bookmark className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>

              <div
                className="mb-8 flex h-48 items-center justify-center rounded-xl"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary-base), var(--color-purple))',
                }}
              >
                <ImageIcon className="h-10 w-10 text-white/40" />
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-8">
                  {(project.shortDescription || project.fullDescription) && (
                    <section>
                      <h2 className="mb-3 text-sm font-bold">
                        About this project
                      </h2>
                      {project.fullDescription ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {project.fullDescription}
                        </p>
                      ) : (
                        project.shortDescription && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {project.shortDescription}
                          </p>
                        )
                      )}
                    </section>
                  )}

                  <section>
                    <h2 className="mb-3 text-sm font-bold">Screenshots</h2>
                    {project.media && project.media.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {project.media.map((m: NonNullable<typeof project.media>[number]) => (
                          <div key={m.id} className="overflow-hidden rounded-xl border bg-muted">
                            <img src={m.publicUrl} alt={m.caption || ''} className="w-full h-auto object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center gap-1.5 py-8 text-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          <p className="text-muted-foreground text-xs">
                            No screenshots available.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </section>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardContent className="space-y-3 pt-4">
                      <h3 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                        Built with
                      </h3>
                      {Object.entries(technologiesByCategory).map(
                        ([category, techs]) => (
                          <div key={category}>
                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                              {
                                TECHNOLOGY_CATEGORY_LABELS[
                                  category as TechnologyCategory
                                ]
                              }
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {techs?.map((tech) => (
                                <span
                                  key={tech.id}
                                  className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
                                >
                                  {tech.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="space-y-2 pt-4">
                      <h3 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                        Repository
                      </h3>
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <Github className="h-3.5 w-3.5" />
                        {project.repositoryId}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="space-y-3 pt-4">
                      <h3 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                        Contributors
                      </h3>
                      {MOCK_CONTRIBUTORS.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {member.role} · {member.verificationStatus}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}