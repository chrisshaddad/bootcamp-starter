'use client';

import { useState } from 'react';
import { Github, ExternalLink, Bookmark, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type {
  ProjectResponse,
  PublicProjectMediaResponse,
} from '@repo/contracts';
import {
  MOCK_CONTRIBUTORS,
  MOCK_TECHNOLOGIES,
  TECHNOLOGY_CATEGORY_LABELS,
  type TechnologyCategory,
} from '@/lib/mock-projects';
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
  project: ProjectResponse & { media: PublicProjectMediaResponse[] };
  onSave?: () => void;
}

export function ProjectShowcase({ project, onSave }: ProjectShowcaseProps) {
  const [lightboxMedia, setLightboxMedia] =
    useState<PublicProjectMediaResponse | null>(null);

  // mock: ProjectTechnology has no endpoint — reuse the fixture list so the
  // "Built with" panel isn't empty while real data isn't available.
  const technologiesByCategory = MOCK_TECHNOLOGIES.reduce<
    Partial<Record<TechnologyCategory, typeof MOCK_TECHNOLOGIES>>
  >((acc, tech) => {
    (acc[tech.category] ??= []).push(tech);
    return acc;
  }, {});

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
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

          <section>
            <h2 className="mb-3 text-sm font-bold">Screenshots</h2>
            {project.media.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {project.media.map((media) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => setLightboxMedia(media)}
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
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-1.5 py-8 text-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs">
                    No screenshots yet.
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
                <div key={member.id} className="flex items-center gap-2">
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

      <Dialog
        open={!!lightboxMedia}
        onOpenChange={(open) => !open && setLightboxMedia(null)}
      >
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none sm:max-w-3xl">
          <DialogTitle className="sr-only">
            {lightboxMedia?.caption ?? `${project.title} screenshot`}
          </DialogTitle>
          {lightboxMedia && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxMedia.publicUrl}
              alt={lightboxMedia.caption ?? project.title}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
