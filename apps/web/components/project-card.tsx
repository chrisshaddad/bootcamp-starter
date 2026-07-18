'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  ExternalLink,
  Github,
  ArrowRight,
  StickyNote,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import {
  getCoverGradient,
  getAccentColor,
  getTechColor,
  getInitials,
} from '@/lib/explore-visuals';
import { cn } from '@/lib/utils';
import type { ExploreProjectResponse } from '@repo/contracts';

const MAX_VISIBLE_TECH = 4;
const MAX_VISIBLE_CONTRIBUTORS = 3;

// Toggle affordance for the Saved Projects list — Explore doesn't pass this,
// so its cards render exactly as before.
export interface ProjectCardSavedState {
  isSaved: boolean;
  onToggle: () => void;
  isToggling?: boolean;
  note?: string | null;
  onNoteSave?: (note: string | null) => void | Promise<void>;
  isSavingNote?: boolean;
}

interface ProjectCardProps {
  project: ExploreProjectResponse;
  savedState?: ProjectCardSavedState;
}

export function ProjectCard({ project, savedState }: ProjectCardProps) {
  const cover = getCoverGradient(project.id);
  const accent = getAccentColor(project.id);
  const visibleTech = project.technologies.slice(0, MAX_VISIBLE_TECH);
  const hiddenTechCount = project.technologies.length - visibleTech.length;
  const creator = project.createdBy;
  const hasCollaborators = project.contributorCount > 1;

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(savedState?.note ?? '');

  const startEditingNote = () => {
    setDraftNote(savedState?.note ?? '');
    setIsEditingNote(true);
  };

  const saveNote = async () => {
    await savedState?.onNoteSave?.(draftNote.trim() || null);
    setIsEditingNote(false);
  };

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
          {savedState && (
            <button
              type="button"
              title={savedState.isSaved ? 'Unsave project' : 'Save project'}
              aria-label={
                savedState.isSaved ? 'Unsave project' : 'Save project'
              }
              disabled={savedState.isToggling}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                savedState.onToggle();
              }}
              className={cn(
                'absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background disabled:opacity-50',
                savedState.isSaved && 'text-primary',
              )}
            >
              <Bookmark
                className="h-3.5 w-3.5"
                fill={savedState.isSaved ? 'currentColor' : 'none'}
              />
            </button>
          )}
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

      {savedState?.onNoteSave &&
        (isEditingNote ? (
          <div className="space-y-2 border-t px-4 py-2.5">
            <Textarea
              autoFocus
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Why did you save this project?"
              maxLength={2000}
              className="min-h-16 text-xs"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingNote(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveNote}
                disabled={savedState.isSavingNote}
              >
                Save note
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditingNote}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-start gap-1.5 border-t px-4 py-2.5 text-left text-xs"
          >
            <StickyNote className="mt-0.5 h-3 w-3 flex-shrink-0" />
            {savedState.note ? (
              <span className="line-clamp-2 italic">
                &ldquo;{savedState.note}&rdquo;
              </span>
            ) : (
              <span>Add a note</span>
            )}
          </button>
        ))}
    </Card>
  );
}
