'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  Send,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  createProjectInvitationRequestSchema,
  type CreateProjectInvitationRequest,
  type ProjectInvitationResponse,
} from '@repo/contracts';
import { ApiError } from '@/lib/api';
import {
  useProjectInvitationActions,
  useProjectInvitations,
} from '@/hooks/use-project-invitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function statusStyles(status: ProjectInvitationResponse['status']) {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-success/10 text-success';
    case 'DECLINED':
    case 'CANCELED':
      return 'bg-destructive/10 text-destructive';
    case 'EXPIRED':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-warning/15 text-foreground';
  }
}

export function ProjectInvitationsManager({
  projectId,
}: {
  projectId: string;
}) {
  const [invitationPage, setInvitationPage] = useState(1);
  const { invitations, meta, isLoading, error } = useProjectInvitations(
    projectId,
    { page: invitationPage, limit: 20 },
  );
  const { searchCollaborator, createInvitation, cancelInvitation } =
    useProjectInvitationActions();
  const [validatedUsername, setValidatedUsername] = useState<string | null>(
    null,
  );
  const [candidateLabel, setCandidateLabel] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    watch,
    trigger,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInvitationRequest>({
    resolver: zodResolver(createProjectInvitationRequestSchema),
    defaultValues: {
      githubUsername: '',
      role: 'CONTRIBUTOR',
      contributionRoleLabel: '',
    },
  });

  const username = watch('githubUsername');
  useEffect(() => {
    if (
      validatedUsername &&
      username.trim().toLowerCase() !== validatedUsername.toLowerCase()
    ) {
      setValidatedUsername(null);
      setCandidateLabel(null);
    }
  }, [username, validatedUsername]);

  const validateCandidate = async () => {
    if (!(await trigger('githubUsername'))) return;
    setIsValidating(true);
    try {
      const candidate = await searchCollaborator(
        projectId,
        getValues('githubUsername'),
      );
      setValidatedUsername(candidate.githubUsername);
      setCandidateLabel(
        `${candidate.platformUser.displayName} · @${candidate.githubUsername} · ${candidate.githubRoleName ?? candidate.githubPermission}`,
      );
      toast.success('GitHub collaborator verified');
    } catch (error) {
      setValidatedUsername(null);
      setCandidateLabel(null);
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to validate this collaborator',
      );
    } finally {
      setIsValidating(false);
    }
  };

  const submitInvitation = async (data: CreateProjectInvitationRequest) => {
    if (
      !validatedUsername ||
      validatedUsername.toLowerCase() !== data.githubUsername.toLowerCase()
    ) {
      toast.error('Validate the GitHub collaborator before inviting them');
      return;
    }
    setIsInviting(true);
    try {
      await createInvitation(projectId, data);
      toast.success('Invitation sent');
      reset();
      setValidatedUsername(null);
      setCandidateLabel(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to send invitation',
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (cancelingId) return;
    setCancelingId(invitationId);
    try {
      await cancelInvitation(projectId, invitationId);
      toast.success('Invitation canceled');
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to cancel invitation',
      );
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collaborator invitations</CardTitle>
        <p className="text-muted-foreground text-sm">
          Invite an existing platform developer who already has access to this
          GitHub repository. They become a member only after accepting.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleSubmit(submitInvitation)}
          className="grid gap-4 rounded-lg border p-4 md:grid-cols-2"
        >
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="githubUsername">Exact GitHub username</Label>
            <div className="flex gap-2">
              <Input
                id="githubUsername"
                autoComplete="off"
                placeholder="octocat"
                aria-invalid={!!errors.githubUsername}
                {...register('githubUsername')}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isValidating || isInviting}
                onClick={validateCandidate}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Validate
              </Button>
            </div>
            {errors.githubUsername && (
              <p className="text-destructive text-sm">
                {errors.githubUsername.message}
              </p>
            )}
            {candidateLabel && (
              <p className="text-success flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                {candidateLabel}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invitationRole">Project role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invitationRole" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contributionRoleLabel">Contribution label</Label>
            <Input
              id="contributionRoleLabel"
              placeholder="Backend developer"
              {...register('contributionRoleLabel')}
            />
          </div>
          <div className="md:col-span-2 md:flex md:justify-end">
            <Button
              type="submit"
              disabled={!validatedUsername || isInviting || isValidating}
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send invitation
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <h3 className="font-medium">Invitation history</h3>
          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading invitations
            </div>
          ) : error ? (
            <div className="text-destructive rounded-lg border border-destructive/50 p-6 text-center text-sm">
              {error instanceof ApiError
                ? error.message
                : 'Unable to load collaborator invitations.'}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              No collaborator invitations yet.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <UserRound className="h-4 w-4" />@
                      {invitation.inviteeGithubUsername}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {invitation.invitee?.displayName ?? 'Deleted account'} ·{' '}
                      {invitation.requestedRole.toLowerCase()}
                      {invitation.contributionRoleLabel
                        ? ` · ${invitation.contributionRoleLabel}`
                        : ''}
                    </p>
                    <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                      <Clock3 className="h-3 w-3" />
                      Sent {new Date(invitation.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(invitation.status)}`}
                    >
                      {invitation.status.toLowerCase()}
                    </span>
                    {invitation.status === 'PENDING' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={cancelingId !== null}
                          >
                            {cancelingId === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Cancel invitation?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              @{invitation.inviteeGithubUsername} will no longer
                              be able to accept this invitation.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Keep invitation
                            </AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleCancel(invitation.id)}
                            >
                              Cancel invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {meta && meta.totalPages > 1 && (
            <Pagination
              page={meta.currentPage}
              totalPages={meta.totalPages}
              onPageChange={setInvitationPage}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
