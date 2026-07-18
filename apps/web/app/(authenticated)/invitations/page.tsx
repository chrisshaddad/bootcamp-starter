'use client';

import { useState } from 'react';
import { Check, Clock3, Github, Inbox, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectInvitationResponse } from '@repo/contracts';
import { ApiError } from '@/lib/api';
import {
  useInvitationInbox,
  useProjectInvitationActions,
} from '@/hooks/use-project-invitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function statusClass(status: ProjectInvitationResponse['status']) {
  if (status === 'ACCEPTED') return 'bg-success/10 text-success';
  if (status === 'PENDING') return 'bg-warning/15 text-foreground';
  if (status === 'EXPIRED') return 'bg-muted text-muted-foreground';
  return 'bg-destructive/10 text-destructive';
}

export default function InvitationsPage() {
  const { invitations, isLoading, error } = useInvitationInbox();
  const { acceptInvitation, declineInvitation } = useProjectInvitationActions();
  const [responding, setResponding] = useState<{
    id: string;
    action: 'accept' | 'decline';
  } | null>(null);

  const respond = async (
    invitation: ProjectInvitationResponse,
    action: 'accept' | 'decline',
  ) => {
    setResponding({ id: invitation.id, action });
    try {
      if (action === 'accept') {
        await acceptInvitation(invitation.id);
        toast.success(`You joined ${invitation.project.title}`);
      } else {
        await declineInvitation(invitation.id);
        toast.success('Invitation declined');
      }
    } catch (responseError) {
      toast.error(
        responseError instanceof ApiError
          ? responseError.message
          : `Unable to ${action} the invitation`,
      );
    } finally {
      setResponding(null);
    }
  };

  const pending = invitations.filter(
    (invitation) => invitation.status === 'PENDING',
  );
  const history = invitations.filter(
    (invitation) => invitation.status !== 'PENDING',
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">
          Collaboration invitations
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review invitations verified against your connected GitHub identity.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="text-destructive py-8 text-center text-sm">
            {error instanceof ApiError
              ? error.message
              : 'Unable to load invitations.'}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-3" aria-labelledby="pending-heading">
            <h2 id="pending-heading" className="font-semibold">
              Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
                  <Inbox className="h-7 w-7" />
                  You have no pending collaboration invitations.
                </CardContent>
              </Card>
            ) : (
              pending.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  responding={responding}
                  onRespond={respond}
                />
              ))
            )}
          </section>

          {history.length > 0 && (
            <section className="space-y-3" aria-labelledby="history-heading">
              <h2 id="history-heading" className="font-semibold">
                History
              </h2>
              {history.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  responding={responding}
                  onRespond={respond}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function InvitationCard({
  invitation,
  responding,
  onRespond,
}: {
  invitation: ProjectInvitationResponse;
  responding: { id: string; action: 'accept' | 'decline' } | null;
  onRespond: (
    invitation: ProjectInvitationResponse,
    action: 'accept' | 'decline',
  ) => Promise<void>;
}) {
  const isPending = invitation.status === 'PENDING';
  const isResponding = responding?.id === invitation.id;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {invitation.project.title}
            </CardTitle>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <Github className="h-4 w-4" />
              {invitation.project.repositoryFullName}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(invitation.status)}`}
          >
            {invitation.status.toLowerCase()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Invited by:</span>{' '}
            {invitation.inviter?.displayName ?? 'Deleted account'}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span>{' '}
            {invitation.requestedRole.toLowerCase()}
          </p>
          {invitation.contributionRoleLabel && (
            <p>
              <span className="text-muted-foreground">Contribution:</span>{' '}
              {invitation.contributionRoleLabel}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">GitHub permission:</span>{' '}
            {invitation.githubRoleName ??
              invitation.githubPermission ??
              'verified'}
          </p>
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock3 className="h-3.5 w-3.5" />
          {isPending
            ? `Expires ${new Date(invitation.expiresAt).toLocaleString()}`
            : `Updated ${new Date(invitation.updatedAt).toLocaleString()}`}
        </p>
        {isPending && (
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              disabled={isResponding}
              onClick={() => onRespond(invitation, 'decline')}
            >
              {responding?.id === invitation.id &&
              responding.action === 'decline' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Decline
            </Button>
            <Button
              disabled={isResponding}
              onClick={() => onRespond(invitation, 'accept')}
            >
              {responding?.id === invitation.id &&
              responding.action === 'accept' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accept
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
