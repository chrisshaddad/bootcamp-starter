'use client';

import { useUser } from '@/hooks/use-auth';
import { useGym } from '@/hooks/use-gyms';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gymReasonRequestSchema, type GymReasonRequest } from '@repo/contracts';
import { ApiError } from '@/lib/api';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Phone,
  MapPin,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  SUSPENDED: 'bg-orange/15 text-orange border-orange/30',
  INACTIVE: 'bg-gray-100 text-gray-800 border-gray-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="h-16 w-16 text-red-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 text-center max-w-md">
        You don&apos;t have permission to access this page. Only Super Admins
        can manage gyms.
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
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function charCount(value: string): number {
  return value.length;
}


export default function GymDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  const rejectForm = useForm<GymReasonRequest>({
    resolver: zodResolver(gymReasonRequestSchema),
    defaultValues: { reason: '' },
  });

  const suspendForm = useForm<GymReasonRequest>({
    resolver: zodResolver(gymReasonRequestSchema),
    defaultValues: { reason: '' },
  });

  const rejectReasonValue = rejectForm.watch('reason');
  const suspendReasonValue = suspendForm.watch('reason');

  const gymId = params.id as string;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    gym,
    isLoading: gymLoading,
    error,
    approve,
    reject,
    suspend,
    reactivate,
  } = useGym(gymId, { enabled: isSuperAdmin });

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approve();
      toast.success('Gym approved successfully');
      setShowApproveDialog(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to approve gym',
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = rejectForm.handleSubmit(async (data) => {
    setIsRejecting(true);
    try {
      await reject(data.reason);
      toast.success('Gym rejected');
      setShowRejectDialog(false);
      rejectForm.reset();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to reject gym',
      );
    } finally {
      setIsRejecting(false);
    }
  });

  const handleSuspend = suspendForm.handleSubmit(async (data) => {
    setIsSuspending(true);
    try {
      await suspend(data.reason);
      toast.success('Gym suspended');
      setShowSuspendDialog(false);
      suspendForm.reset();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to suspend gym',
      );
    } finally {
      setIsSuspending(false);
    }
  });

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await reactivate();
      toast.success('Gym reactivated');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to reactivate gym',
      );
    } finally {
      setIsReactivating(false);
    }
  };

  if (userLoading || gymLoading) {
    return <LoadingSkeleton />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="text-error mb-4">Failed to load gym</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="py-10 text-center">
        <div className="text-gray-500 mb-4">Gym not found</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isPending = gym.status === 'PENDING';
  const isActive = gym.status === 'ACTIVE';
  const isSuspended = gym.status === 'SUSPENDED';

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/gyms')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Gyms
      </Button>

      {gym.statusReason && (isSuspended || gym.status === 'REJECTED') && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            isSuspended
              ? 'border-orange/30 bg-orange/10 text-orange'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span className="font-medium">
            {isSuspended ? 'Suspension reason: ' : 'Rejection reason: '}
          </span>
          {gym.statusReason}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{gym.name}</h1>
          <div className="mt-2">
            <StatusBadge status={gym.status} />
          </div>
        </div>

        <div className="flex gap-3">
          {isPending && (
            <>
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
            </>
          )}
          {isActive && (
            <Button
              variant="outline"
              className="gap-2 text-orange border-orange/30 hover:bg-orange/10"
              onClick={() => setShowSuspendDialog(true)}
            >
              <ShieldX className="h-4 w-4" />
              Suspend
            </Button>
          )}
          {isSuspended && (
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleReactivate}
              disabled={isReactivating}
            >
              <CheckCircle className="h-4 w-4" />
              {isReactivating ? 'Reactivating...' : 'Reactivate'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Gym Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {gym.description && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <p className="text-sm text-gray-700">{gym.description}</p>
              </div>
            )}
            <InfoRow icon={Phone} label="Phone" value={gym.phone} />
            <InfoRow icon={MapPin} label="Address" value={gym.address} />
            <InfoRow
              icon={Globe}
              label="Website"
              value={
                gym.website ? (
                  <a
                    href={gym.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {gym.website}
                  </a>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )
              }
            />
            <InfoRow
              icon={Users}
              label="Registered Members"
              value={`${gym._count.members} member${gym._count.members !== 1 ? 's' : ''}`}
            />
            <InfoRow
              icon={Users}
              label="Staff Users"
              value={`${gym._count.users} user${gym._count.users !== 1 ? 's' : ''}`}
            />
            <InfoRow
              icon={Calendar}
              label="Registered"
              value={new Date(gym.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
            {gym.approvedAt && (
              <InfoRow
                icon={CheckCircle}
                label="Approved"
                value={new Date(gym.approvedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              People
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Created By
                </div>
                <div className="font-medium text-gray-900">
                  {gym.createdBy.name}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Mail className="h-4 w-4" />
                  {gym.createdBy.email}
                </div>
              </div>

              {gym.approvedBy ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-xs text-green-600 uppercase tracking-wide mb-2">
                    Approved By
                  </div>
                  <div className="font-medium text-gray-900">
                    {gym.approvedBy.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    {gym.approvedBy.email}
                  </div>
                </div>
              ) : isPending ? (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Awaiting Approval</span>
                  </div>
                  <p className="mt-1 text-sm text-yellow-600">
                    This gym is waiting for a super admin to review and approve
                    the registration.
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Gym</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{gym.name}</strong>? This
              will allow the gym admin to start inviting members and using the
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

      <Dialog
        open={showRejectDialog}
        onOpenChange={(open) => {
          setShowRejectDialog(open);
          if (!open) rejectForm.reset();
        }}
      >
        <DialogContent>
          <form onSubmit={handleReject}>
            <DialogHeader>
              <DialogTitle>Reject Gym</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting <strong>{gym.name}</strong>. The
                gym admin will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="e.g. Incomplete business information provided."
                className="field-sizing-fixed resize-none max-h-36 overflow-y-auto"
                rows={3}
                {...rejectForm.register('reason')}
              />
              {rejectForm.formState.errors.reason ? (
                <p className="text-xs text-error">
                  {rejectForm.formState.errors.reason.message}
                </p>
              ) : (
                <div
                  className={`text-xs text-right ${charCount(rejectReasonValue) > 500 ? 'text-error' : 'text-gray-400'}`}
                >
                  {charCount(rejectReasonValue)} / 500 characters
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  rejectForm.reset();
                }}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSuspendDialog}
        onOpenChange={(open) => {
          setShowSuspendDialog(open);
          if (!open) suspendForm.reset();
        }}
      >
        <DialogContent>
          <form onSubmit={handleSuspend}>
            <DialogHeader>
              <DialogTitle>Suspend Gym</DialogTitle>
              <DialogDescription>
                Provide a reason for suspending <strong>{gym.name}</strong>. The
                owner&apos;s sessions will be terminated.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="suspend-reason">Reason</Label>
              <Textarea
                id="suspend-reason"
                placeholder="e.g. Violation of terms of service."
                className="field-sizing-fixed resize-none max-h-36 overflow-y-auto"
                rows={3}
                {...suspendForm.register('reason')}
              />
              {suspendForm.formState.errors.reason ? (
                <p className="text-xs text-error">
                  {suspendForm.formState.errors.reason.message}
                </p>
              ) : (
                <div
                  className={`text-xs text-right ${charCount(suspendReasonValue) > 500 ? 'text-error' : 'text-gray-400'}`}
                >
                  {charCount(suspendReasonValue)} / 500 characters
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSuspendDialog(false);
                  suspendForm.reset();
                }}
                disabled={isSuspending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSuspending}
              >
                {isSuspending ? 'Suspending...' : 'Suspend'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
