'use client';

import { useUser } from '@/hooks/use-auth';
import { useInstitution } from '@/hooks/use-institutions';
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
  MapPin,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { ForbiddenPage } from '@/components/forbidden-page';

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
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function InstitutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const institutionId = params.id as string;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    institution,
    isLoading: institutionLoading,
    error,
    approve,
    reject,
  } = useInstitution(institutionId, { enabled: isSuperAdmin });

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approve();
      toast.success('Institution approved successfully');
      setShowApproveDialog(false);
    } catch (err) {
      toast.error('Failed to approve institution');
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await reject();
      toast.success('Institution rejected');
      setShowRejectDialog(false);
    } catch (err) {
      toast.error('Failed to reject institution');
      console.error(err);
    } finally {
      setIsRejecting(false);
    }
  };

  if (userLoading || institutionLoading) {
    return <LoadingSkeleton />;
  }

  // Show 403 for non-super admins
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <ForbiddenPage message="You don't have permission to access this page. Only Super Admins can manage institutions." />
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="text-red-500 mb-4">Failed to load institution</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="py-10 text-center">
        <div className="text-gray-500 mb-4">Institution not found</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isPending = institution.status === 'PENDING';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/institutions')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Institutions
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {institution.name}
          </h1>
          <div className="mt-2">
            <StatusBadge status={institution.status} />
          </div>
        </div>

        {/* Action Buttons (only for PENDING institutions) */}
        {isPending && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
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
        {/* Institution Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Institution Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow icon={Building2} label="Type" value={institution.type} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={
                institution.address || (
                  <span className="text-gray-400">Not provided</span>
                )
              }
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={
                institution.phone || (
                  <span className="text-gray-400">Not provided</span>
                )
              }
            />
            <InfoRow
              icon={Calendar}
              label="Registered"
              value={new Date(institution.createdAt).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}
            />
          </CardContent>
        </Card>

        {/* Members / Status Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Total Members
                </div>
                <div className="font-medium text-gray-900">
                  {institution._count.users} user
                  {institution._count.users !== 1 ? 's' : ''}
                </div>
              </div>

              {isPending && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Awaiting Approval</span>
                  </div>
                  <p className="mt-1 text-sm text-yellow-600">
                    This institution is waiting for a super admin to review and
                    approve the registration.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Institution</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve{' '}
              <strong>{institution.name}</strong>? This will allow the
              institution admin to start inviting members and using the
              platform.
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
              className="bg-green-600 hover:bg-green-700"
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
            <DialogTitle>Reject Institution</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject{' '}
              <strong>{institution.name}</strong>? The institution admin will
              not be able to use the platform.
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
