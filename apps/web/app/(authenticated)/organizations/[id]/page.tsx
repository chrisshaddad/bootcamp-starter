'use client';

import { useUser } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organizations';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  ShieldX,
  Clock,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  ACTIVE: 'bg-green-500/15 text-green-300 border-green-500/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
  SUSPENDED: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  INACTIVE: 'bg-muted text-muted-foreground border-border',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${STATUS_COLORS[status] || 'bg-muted text-muted-foreground border-border'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="text-destructive mb-4 h-16 w-16" />
      <h1 className="text-foreground mb-2 text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground max-w-md text-center">
        You don&apos;t have permission to access this page. Only Super Admins
        can manage organizations.
      </p>
    </div>
  );
}

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
    <div className="border-border flex items-start gap-3 border-b py-3 last:border-0">
      <Icon className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-sm">{label}</div>
        <div className="text-foreground mt-0.5 text-sm font-medium">
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
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const orgId = params.id as string;
  const isSuperAdmin = user?.accountType === 'SUPER_ADMIN';

  const {
    organization: org,
    isLoading: orgLoading,
    error,
    approve,
    reject,
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

  if (userLoading || orgLoading) {
    return <LoadingSkeleton />;
  }

  // Show 403 for non-super admins
  if (user?.accountType !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="text-destructive mb-4">Failed to load organization</div>
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
        <div>
          <h1 className="text-foreground text-2xl font-bold">{org.name}</h1>
          <div className="mt-2">
            <StatusBadge status={org.status} />
          </div>
        </div>

        {/* Action Buttons (only for PENDING organizations) */}
        {isPending && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              className="bg-success hover:bg-success-dark gap-2 text-white"
              onClick={() => setShowApproveDialog(true)}
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </div>
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
              <div className="bg-muted mb-4 rounded-lg p-3">
                <div className="text-muted-foreground mb-1 text-sm">
                  Description
                </div>
                <p className="text-foreground text-sm">{org.description}</p>
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
                    className="text-primary hover:underline"
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
              value={`${org._count.users} user${org._count.users !== 1 ? 's' : ''}`}
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
              <div className="bg-muted rounded-lg p-4">
                <div className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
                  Created By
                </div>
                <div className="text-foreground font-medium">
                  {org.createdBy.name}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  {org.createdBy.email}
                </div>
              </div>

              {/* Approved By (if applicable) */}
              {org.approvedBy ? (
                <div className="rounded-lg bg-green-500/10 p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-green-400">
                    Approved By
                  </div>
                  <div className="text-foreground font-medium">
                    {org.approvedBy.name}
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    {org.approvedBy.email}
                  </div>
                </div>
              ) : isPending ? (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <div className="flex items-center gap-2 text-yellow-300">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Awaiting Approval</span>
                  </div>
                  <p className="mt-1 text-sm text-yellow-400">
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
              className="bg-success hover:bg-success-dark text-white"
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
    </div>
  );
}
