'use client';

import Link from 'next/link';
import { FolderGit2, Github, ExternalLink, Pencil, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/use-projects';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from '@/lib/project-status';

const THUMB_GRADIENTS = [
  'from-primary-base to-accent',
  'from-purple to-accent',
  'from-orange to-accent',
];

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-56 w-full" />
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, isLoading } = useProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Repos you&apos;ve linked and published to your public profile
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            Add project
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <FolderGit2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No projects yet</p>
          <p className="text-muted-foreground max-w-xs text-sm">
            Link a repository to showcase your work.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Card
              key={project.id}
              className="flex flex-col overflow-hidden py-0"
            >
              <div
                className={`relative flex h-20 items-center bg-gradient-to-br px-4 ${THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]}`}
              >
                <span
                  className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${PROJECT_STATUS_COLORS[project.status]}`}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 px-4 pt-3">
                {project.isMock && (
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Sample data
                  </span>
                )}
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="text-sm font-semibold hover:text-primary"
                >
                  {project.title}
                </Link>
                {project.shortDescription && (
                  <p className="line-clamp-2 text-muted-foreground text-xs">
                    {project.shortDescription}
                  </p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech.id}
                        className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
                      >
                        {tech.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t px-4 py-2.5">
                <div className="flex items-center gap-3 text-muted-foreground">
                  {'repositoryFullName' in project &&
                    project.repositoryFullName && (
                      <span
                        className="inline-flex items-center gap-1 text-xs"
                        title={project.repositoryFullName}
                      >
                        <Github className="h-3.5 w-3.5" />
                      </span>
                    )}
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
                  {project.status === 'PUBLISHED' && (
                    <Link
                      href={`/projects/${project.slug}`}
                      className="text-xs hover:text-primary"
                      target="_blank"
                    >
                      View public page
                    </Link>
                  )}
                </div>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
