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
import { StatusBadge } from '@/components/status-badge';
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

// Detail page uses a slightly fuller label for the pending state.
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Approval',
};

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-danger" />
      <h1 className="mb-2 font-display text-2xl font-medium text-text-1">
        Access Denied
      </h1>
      <p className="max-w-md text-center text-text-2">
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
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-text-3" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-2">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-text-1">{value}</div>
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
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
  if (user?.role !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="mb-4 text-danger">Failed to load organization</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="py-10 text-center">
        <div className="mb-4 text-text-2">Organization not found</div>
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
          <h1 className="font-display text-[26px] font-medium text-text-1">
            {org.name}
          </h1>
          <div className="mt-2">
            <StatusBadge
              status={org.status}
              label={STATUS_LABELS[org.status]}
              size="md"
            />
          </div>
        </div>

        {/* Action Buttons (only for PENDING organizations) */}
        {isPending && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 border-danger/30 text-danger hover:bg-error-light hover:text-danger"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              className="gap-2 bg-success text-white hover:bg-success/90"
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
            <CardTitle className="flex items-center gap-2 font-display text-lg font-medium">
              <Building2 className="h-5 w-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {org.description && (
              <div className="mb-4 rounded-lg bg-sunken p-3">
                <div className="mb-1 text-sm text-text-2">Description</div>
                <p className="text-sm text-text-1">{org.description}</p>
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
                    className="text-spine hover:underline"
                  >
                    {org.website}
                  </a>
                ) : (
                  <span className="text-text-3">Not provided</span>
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
            <CardTitle className="flex items-center gap-2 font-display text-lg font-medium">
              <Users className="h-5 w-5" />
              People
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Created By */}
              <div className="rounded-lg bg-sunken p-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-text-3">
                  Created By
                </div>
                <div className="font-medium text-text-1">
                  {org.createdBy.name}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-text-2">
                  <Mail className="h-4 w-4" />
                  {org.createdBy.email}
                </div>
              </div>

              {/* Approved By (if applicable) */}
              {org.approvedBy ? (
                <div className="rounded-lg bg-success/10 p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-success">
                    Approved By
                  </div>
                  <div className="font-medium text-text-1">
                    {org.approvedBy.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-text-2">
                    <Mail className="h-4 w-4" />
                    {org.approvedBy.email}
                  </div>
                </div>
              ) : isPending ? (
                <div className="rounded-lg border border-amber/40 bg-amber-soft p-4">
                  <div className="flex items-center gap-2 text-amber-strong">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Awaiting Approval</span>
                  </div>
                  <p className="mt-1 text-sm text-amber-strong">
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
              className="bg-success text-white hover:bg-success/90"
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
