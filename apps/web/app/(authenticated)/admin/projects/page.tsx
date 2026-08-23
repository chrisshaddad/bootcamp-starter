'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RotateCcw, ShieldBan } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminProjectResponse } from '@repo/contracts';
import {
  AdminError,
  AdminPageHeader,
  Pagination,
  StatusBadge,
} from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAdminProjects } from '@/hooks/use-admin';
import { ApiError } from '@/lib/api';

export default function AdminProjectsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [moderated, setModerated] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminProjectResponse | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { response, isLoading, error, moderate } = useAdminProjects({
    page,
    limit: 20,
    search: search || undefined,
    status:
      status === 'ALL'
        ? undefined
        : (status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SUSPENDED'),
    moderated: moderated === 'ALL' ? undefined : moderated === 'YES',
  });

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const action = selected?.status === 'SUSPENDED' ? 'RESTORE' : 'SUSPEND';
  const submitModeration = async () => {
    if (!selected || reason.trim().length < 10) return;
    setSubmitting(true);
    try {
      await moderate(selected.id, { action, reason: reason.trim() });
      toast.success(
        action === 'SUSPEND'
          ? 'Project suspended'
          : 'Project restored as a draft',
      );
      setSelected(null);
      setReason('');
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : 'Unable to moderate project',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Projects"
        description="Review project ownership, publication state, collaborators, and moderation history."
      />
      <Card>
        <CardContent className="space-y-5 px-4 pt-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <form
              className="flex flex-1 flex-col gap-2 sm:flex-row"
              onSubmit={submitSearch}
            >
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search title, slug, repository, or owner email"
                aria-label="Search projects"
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Search
              </Button>
            </form>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={moderated}
              onValueChange={(value) => {
                setModerated(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All projects</SelectItem>
                <SelectItem value="YES">Admin moderated</SelectItem>
                <SelectItem value="NO">Not moderated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <AdminError message="Unable to load projects." />
          ) : isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : !response?.data.length ? (
            <p className="text-muted-foreground py-14 text-center text-sm">
              No projects match these filters.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {response.data.map((project) => {
                  const canRestore = project.status === 'SUSPENDED';
                  const ownerArchived =
                    project.status === 'ARCHIVED' && !project.moderatedAt;
                  return (
                    <article key={project.id} className="rounded-lg border p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/projects/${project.id}/preview`}
                            className="inline-flex max-w-full items-center gap-1 break-words font-medium"
                          >
                            {project.title}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </Link>
                          <div className="break-all text-xs text-muted-foreground">
                            {project.repositoryFullName}
                          </div>
                        </div>
                        <StatusBadge
                          tone={
                            project.status === 'PUBLISHED'
                              ? 'success'
                              : project.status === 'ARCHIVED' ||
                                  project.status === 'SUSPENDED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {project.status}
                        </StatusBadge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="text-muted-foreground">Owner</div>
                          <div className="mt-1 break-words font-medium">
                            {project.owner.displayName}
                          </div>
                          <div className="break-all text-muted-foreground">
                            {project.owner.email}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Activity</div>
                          <div className="mt-1 font-medium">
                            {project.memberCount} members
                          </div>
                          <div className="text-muted-foreground">
                            Updated{' '}
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {project.moderationReason && (
                        <p className="mt-3 break-words rounded-md bg-error/5 p-3 text-xs text-error">
                          {project.moderationReason}
                        </p>
                      )}

                      <div className="mt-4">
                        {ownerArchived ? (
                          <StatusBadge>Owner archived</StatusBadge>
                        ) : (
                          <Button
                            className="w-full"
                            size="sm"
                            variant={canRestore ? 'outline' : 'destructive'}
                            onClick={() => setSelected(project)}
                          >
                            {canRestore ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <ShieldBan className="h-4 w-4" />
                            )}
                            {canRestore ? 'Restore' : 'Suspend'}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {response.data.map((project) => {
                      const canRestore = project.status === 'SUSPENDED';
                      const ownerArchived =
                        project.status === 'ARCHIVED' && !project.moderatedAt;
                      return (
                        <TableRow key={project.id}>
                          <TableCell>
                            <Link
                              href={`/projects/${project.id}/preview`}
                              className="group inline-flex items-center gap-1 font-medium"
                            >
                              {project.title}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                            </Link>
                            <div className="text-muted-foreground text-xs">
                              {project.repositoryFullName}
                            </div>
                            {project.moderationReason && (
                              <div className="text-error mt-1 max-w-72 truncate text-xs">
                                {project.moderationReason}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {project.owner.displayName}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {project.owner.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              tone={
                                project.status === 'PUBLISHED'
                                  ? 'success'
                                  : project.status === 'ARCHIVED' ||
                                      project.status === 'SUSPENDED'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {project.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {project.memberCount}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {ownerArchived ? (
                              <StatusBadge>Owner archived</StatusBadge>
                            ) : (
                              <Button
                                size="sm"
                                variant={canRestore ? 'outline' : 'destructive'}
                                onClick={() => setSelected(project)}
                              >
                                {canRestore ? (
                                  <RotateCcw className="h-4 w-4" />
                                ) : (
                                  <ShieldBan className="h-4 w-4" />
                                )}
                                {canRestore ? 'Restore' : 'Suspend'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {response && (
            <Pagination
              page={response.meta.currentPage}
              totalPages={response.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'SUSPEND' ? 'Suspend project' : 'Restore project'}
            </DialogTitle>
            <DialogDescription>
              {action === 'SUSPEND'
                ? 'The project becomes unavailable and its owner cannot modify or republish it. Repository ownership and member data are not changed.'
                : 'For safety, a restored project returns as a draft and its owner decides whether to publish it again.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-action-reason">Reason</Label>
            <Textarea
              id="project-action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Provide at least 10 characters for the audit record"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              disabled={reason.trim().length < 10 || submitting}
              variant={action === 'SUSPEND' ? 'destructive' : 'default'}
              onClick={submitModeration}
            >
              {submitting
                ? 'Saving…'
                : action === 'SUSPEND'
                  ? 'Suspend project'
                  : 'Restore as draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
