'use client';

import { useState } from 'react';
import {
  Github,
  ExternalLink,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type {
  ProjectResponse,
  PublicProjectMediaResponse,
  ProjectTechnologyResponse,
  TechnologyResponse,
} from '@repo/contracts';
import { TECHNOLOGY_CATEGORY_LABELS } from '@/lib/technology-labels';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from '@/lib/project-status';

// Shared between the public showcase page (/projects/[slug]) and the
// authenticated owner preview (/projects/[id]/preview) so both render
// identically — the preview is only useful if it matches what recruiters
// actually see. Both routes' responses carry a superset of
// PublicProjectMediaResponse, so that's the shape this component needs.
interface ProjectShowcaseProps {
  project: ProjectResponse & {
    repositoryUrl: string;
    media: PublicProjectMediaResponse[];
    technologies: ProjectTechnologyResponse[];
  };
  onSave?: () => void;
}

export function ProjectShowcase({ project, onSave }: ProjectShowcaseProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxMedia =
    lightboxIndex !== null ? project.media[lightboxIndex] : null;

  const showPrevious = () =>
    setLightboxIndex((current) =>
      current === null
        ? current
        : (current - 1 + project.media.length) % project.media.length,
    );
  const showNext = () =>
    setLightboxIndex((current) =>
      current === null ? current : (current + 1) % project.media.length,
    );

  const technologiesByCategory = project.technologies.reduce<
    Partial<Record<TechnologyResponse['category'], TechnologyResponse[]>>
  >((acc, projectTechnology) => {
    const tech = projectTechnology.technology;
    (acc[tech.category] ??= []).push(tech);
    return acc;
  }, {});

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {project.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logoUrl}
              alt={`${project.title} logo`}
              className="h-16 w-16 flex-shrink-0 rounded-xl border object-cover"
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.title}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${PROJECT_STATUS_COLORS[project.status]}`}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {project.deploymentUrl && (
            <Button variant="outline" asChild>
              <a href={project.deploymentUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Live demo
              </a>
            </Button>
          )}
          {onSave && (
            <Button onClick={onSave}>
              <Bookmark className="h-4 w-4" />
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-8">
          {(project.shortDescription || project.fullDescription) && (
            <section>
              <h2 className="mb-3 text-sm font-bold">About this project</h2>
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

          {project.media.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold">Screenshots</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {project.media.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.publicUrl}
                      alt={media.caption ?? project.title}
                      className="aspect-video w-full cursor-zoom-in rounded-lg border object-cover"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <h3 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                Built with
              </h3>
              {project.technologies.length > 0 ? (
                Object.entries(technologiesByCategory).map(
                  ([category, techs]) => (
                    <div key={category}>
                      <p className="text-muted-foreground mb-1 text-xs font-medium">
                        {
                          TECHNOLOGY_CATEGORY_LABELS[
                            category as TechnologyResponse['category']
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
                )
              ) : (
                <p className="text-muted-foreground text-xs">
                  No technologies added yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <h3 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                Repository
              </h3>
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open repository ${project.repositoryUrl} in a new tab`}
                className="group flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm font-medium transition-colors hover:border-border hover:bg-muted/60"
              >
                <span className="mt-0.5 rounded-md bg-background p-1.5 text-muted-foreground transition-colors group-hover:text-foreground">
                  <Github className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Open repository
                  </span>
                  <span className="mt-0.5 block break-all text-foreground">
                    {project.repositoryUrl}
                  </span>
                </span>
                <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={!!lightboxMedia}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      >
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none sm:max-w-3xl">
          <DialogTitle className="sr-only">
            {lightboxMedia?.caption ?? `${project.title} screenshot`}
          </DialogTitle>
          {lightboxMedia && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxMedia.publicUrl}
                alt={lightboxMedia.caption ?? project.title}
                className="max-h-[85vh] w-full rounded-lg object-contain"
              />
              {project.media.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={showPrevious}
                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full"
                    aria-label="Previous screenshot"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={showNext}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full"
                    aria-label="Next screenshot"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
