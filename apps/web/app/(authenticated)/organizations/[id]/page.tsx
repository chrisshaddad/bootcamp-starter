'use client';

import { useUser } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organizations';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { ForbiddenPage } from '@/components/forbidden-page';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Building2,
  Users,
  Globe,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Power,
  PowerOff,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning-light text-warning-dark border-warning/30',
  ACTIVE: 'bg-success-light text-success-dark border-success/30',
  REJECTED: 'bg-error-light text-error border-error/30',
  SUSPENDED:
    'bg-library-accent-100 text-library-accent-800 border-library-accent-300',
  INACTIVE: 'bg-muted text-muted-foreground border-border',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  const orgId = params.id as string;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    organization: org,
    isLoading: orgLoading,
    error,
    approve,
    reject,
    activate,
    deactivate,
  } = useOrganization(orgId, { enabled: isSuperAdmin });

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approve();
      toast.success('Organization approved successfully');
      setShowApproveDialog(false);
    } catch (err) {
      toast.error('Failed to approve organization');
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await reject();
      toast.success('Organization rejected');
      setShowRejectDialog(false);
    } catch (err) {
      toast.error('Failed to reject organization');
      console.error(err);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await deactivate();
      toast.success('Library deactivated');
      setShowDeactivateDialog(false);
    } catch (err) {
      toast.error('Failed to deactivate library');
      console.error(err);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await activate();
      toast.success('Library activated');
      setShowActivateDialog(false);
    } catch (err) {
      toast.error('Failed to activate library');
      console.error(err);
    } finally {
      setIsActivating(false);
    }
  };

  if (userLoading || orgLoading) {
    return <LoadingSkeleton />;
  }

  // Show 403 for non-super admins
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <ForbiddenPage message="Only Super Admins can manage organizations." />
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="text-error mb-4">Failed to load organization</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="py-10 text-center">
        <div className="text-muted-foreground mb-4">Organization not found</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isPending = org.status === 'PENDING';
  const isActive = org.status === 'ACTIVE';
  const canActivate = org.status === 'SUSPENDED' || org.status === 'INACTIVE';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/organizations')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 rounded-lg">
            <AvatarImage
              src={org.logoUrl ?? undefined}
              alt={`${org.name} logo`}
            />
            <AvatarFallback className="rounded-lg bg-library-primary-100 text-lg text-library-primary-900">
              {org.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
            <div className="mt-2">
              <StatusBadge
                status={org.status}
                labels={STATUS_LABELS}
                colors={STATUS_COLORS}
                className="border px-3 py-1 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons — approve/reject for PENDING, activate/deactivate otherwise */}
        {isPending && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 text-error border-error/30 hover:bg-error-light"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              className="gap-2 bg-success text-white hover:bg-success-dark"
              onClick={() => setShowApproveDialog(true)}
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </div>
        )}
        {isActive && (
          <Button
            variant="outline"
            className="gap-2 text-error border-error/30 hover:bg-error-light"
            onClick={() => setShowDeactivateDialog(true)}
          >
            <PowerOff className="h-4 w-4" />
            Deactivate
          </Button>
        )}
        {canActivate && (
          <Button
            className="gap-2 bg-success text-white hover:bg-success-dark"
            onClick={() => setShowActivateDialog(true)}
          >
            <Power className="h-4 w-4" />
            Activate
          </Button>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {org.description && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  Description
                </div>
                <p className="text-sm text-foreground/80">{org.description}</p>
              </div>
            )}
            <InfoRow
              icon={Globe}
              label="Website"
              value={
                org.website ? (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-library-primary hover:underline"
                  >
                    {org.website}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )
              }
            />
            <InfoRow
              icon={Users}
              label="Members"
              value={`${org._count.members} member${org._count.members !== 1 ? 's' : ''}`}
            />
            <InfoRow
              icon={Calendar}
              label="Registered"
              value={new Date(org.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
            {org.approvedAt && (
              <InfoRow
                icon={CheckCircle}
                label="Approved"
                value={new Date(org.approvedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            )}
          </CardContent>
        </Card>

        {/* Creator & Approver Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              People
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Created By */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Created By
                </div>
                <div className="font-medium text-foreground">
                  {org.createdBy.name}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {org.createdBy.email}
                </div>
              </div>

              {/* Approved By (if applicable) */}
              {org.approvedBy ? (
                <div className="p-4 bg-success-light rounded-lg">
                  <div className="text-xs text-success-dark uppercase tracking-wide mb-2">
                    Approved By
                  </div>
                  <div className="font-medium text-foreground">
                    {org.approvedBy.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {org.approvedBy.email}
                  </div>
                </div>
              ) : isPending ? (
                <div className="p-4 bg-warning-light rounded-lg border border-warning/30">
                  <div className="flex items-center gap-2 text-warning-dark">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Awaiting Approval</span>
                  </div>
                  <p className="mt-1 text-sm text-warning-dark/80">
                    This organization is waiting for a super admin to review and
                    approve the registration.
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{org.name}</strong>? This
              will allow the organization admin to start inviting members and
              using the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              className="bg-success text-white hover:bg-success-dark"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject <strong>{org.name}</strong>? The
              organization admin will not be able to use the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Library</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <strong>{org.name}</strong>?
              Its staff and members will lose access until it is reactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeactivateDialog(false)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Library</DialogTitle>
            <DialogDescription>
              Are you sure you want to activate <strong>{org.name}</strong>? Its
              staff and members will regain access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActivateDialog(false)}
              disabled={isActivating}
            >
              Cancel
            </Button>
            <Button
              className="bg-success text-white hover:bg-success-dark"
              onClick={handleActivate}
              disabled={isActivating}
            >
              {isActivating ? 'Activating...' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
