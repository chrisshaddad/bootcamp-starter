'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/pagination';
import { ProjectCard } from '@/components/project-card';
import {
  useSavedProjects,
  useUnsaveProject,
  useUpdateSavedProjectNote,
} from '@/hooks/use-saved-projects';
import { ApiError } from '@/lib/api';

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-80 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function SavedProjectsPage() {
  const [page, setPage] = useState(1);
  const { projects, meta, isLoading, error } = useSavedProjects({
    page,
    limit: 6,
  });
  const unsaveProject = useUnsaveProject();
  const updateNote = useUpdateSavedProjectNote();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const handleUnsave = async (projectId: string) => {
    setTogglingId(projectId);
    try {
      await unsaveProject(projectId);
      toast.success('Removed from saved projects.');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Something went wrong.',
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleNoteSave = async (projectId: string, note: string | null) => {
    setSavingNoteId(projectId);
    try {
      await updateNote(projectId, note);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Something went wrong.',
      );
    } finally {
      setSavingNoteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Saved Projects</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Projects you&apos;ve bookmarked for later.
        </p>
      </div>

      {error ? (
        <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <p className="font-medium">Unable to load saved projects</p>
          <p className="text-muted-foreground max-w-xs text-sm">
            {error instanceof ApiError
              ? error.message
              : 'Something went wrong.'}
          </p>
        </Card>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <Bookmark className="text-muted-foreground h-8 w-8" />
          <p className="font-medium">No saved projects yet</p>
          <p className="text-muted-foreground max-w-xs text-sm">
            Bookmark a project from its page to find it here later.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                savedState={{
                  isSaved: true,
                  onToggle: () => handleUnsave(project.id),
                  isToggling: togglingId === project.id,
                  note: project.note,
                  onNoteSave: (note) => handleNoteSave(project.id, note),
                  isSavingNote: savingNoteId === project.id,
                }}
              />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-between">
              <p className="text-muted-foreground text-sm">
                Page {meta.currentPage} of {meta.totalPages} ({meta.totalItems}{' '}
                total saved)
              </p>
              <Pagination
                page={meta.currentPage}
                totalPages={meta.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
