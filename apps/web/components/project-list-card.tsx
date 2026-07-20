import Link from 'next/link';
import { ExternalLink, Pencil } from 'lucide-react';
import type { ProjectResponse } from '@repo/contracts';
import { Card } from '@/components/ui/card';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from '@/lib/project-status';

const THUMB_GRADIENTS = [
  'from-primary-base to-accent',
  'from-purple to-accent',
  'from-orange to-accent',
];

interface ProjectListCardProps {
  project: {
    id: string;
    title: string;
    shortDescription: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    status: ProjectResponse['status'];
    role?: string | null;
    deploymentUrl?: string | null;
  };
  href: string;
  index: number;
  editHref?: string;
  publicHref?: string;
}

export function ProjectListCard({
  project,
  href,
  index,
  editHref,
  publicHref,
}: ProjectListCardProps) {
  return (
    <Card className="group relative flex flex-col overflow-hidden py-0">
      {editHref && (
        <Link
          href={editHref}
          className="absolute top-9 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      )}

      <Link href={href} className="flex flex-1 flex-col">
        <div className="relative aspect-video overflow-hidden">
          {project.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="h-full w-full object-cover transition-[filter] duration-200 group-hover:brightness-95"
            />
          ) : (
            <div
              className={`h-full bg-gradient-to-br transition-[filter] duration-200 group-hover:brightness-110 ${THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]}`}
            />
          )}

          <span
            className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${PROJECT_STATUS_COLORS[project.status]}`}
          >
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          {project.role && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold capitalize text-foreground shadow-sm">
              {project.role.toLowerCase()}
            </span>
          )}
        </div>

        <div className="flex flex-1 gap-3 px-4 py-3">
          {project.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logoUrl}
              alt={`${project.title} logo`}
              className="h-12 w-12 flex-shrink-0 rounded-lg border object-cover"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="truncate text-sm font-semibold hover:text-primary">
              {project.title}
            </p>
            {project.shortDescription && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {project.shortDescription}
              </p>
            )}
          </div>
        </div>
      </Link>

      {(project.deploymentUrl || publicHref) && (
        <div className="mt-3 flex items-center gap-3 border-t px-4 py-2.5 text-muted-foreground">
          {project.deploymentUrl && (
            <a
              href={project.deploymentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {publicHref && (
            <Link
              href={publicHref}
              className="text-xs hover:text-primary"
              target="_blank"
            >
              View public page
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
