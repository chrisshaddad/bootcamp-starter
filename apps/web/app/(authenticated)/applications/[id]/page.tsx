'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useApplication,
  useApplicationMutations,
} from '@/hooks/use-applications';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@repo/contracts';

const STATUS_BADGE_COLORS: Record<ApplicationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
};

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right">{children}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-96" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { application, isLoading, error } = useApplication(id);
  const { withdrawApplication } = useApplicationMutations();

  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await withdrawApplication(id);
      toast.success('Application withdrawn');
      setWithdrawDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to withdraw application. Please try again.');
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !application) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/applications')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </button>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <p className="text-sm text-gray-500">
            {error ? 'Failed to load application' : 'Application not found'}
          </p>
        </div>
      </div>
    );
  }

  const canWithdraw = application.status === 'PENDING';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/applications')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {application.opportunity.title}
            </h1>
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
              {toLabel(application.opportunity.type)}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                STATUS_BADGE_COLORS[application.status],
              )}
            >
              {toLabel(application.status)}
            </span>
          </div>
        </div>

        {canWithdraw && (
          <Button
            variant="outline"
            onClick={() => setWithdrawDialogOpen(true)}
            className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Withdraw Application
          </Button>
        )}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card className="p-6 border-gray-200 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Application Details
          </h2>
          <div>
            <InfoRow label="Status">{toLabel(application.status)}</InfoRow>
            <InfoRow label="Applied on">
              {new Date(application.createdAt).toLocaleDateString()}
            </InfoRow>
            {application.fitScore != null && (
              <InfoRow label="Fit Score">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {Math.round(application.fitScore)}%
                </span>
              </InfoRow>
            )}
            {application.managerApproved != null && (
              <InfoRow label="Manager Approval">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {application.managerApproved ? 'Approved' : 'Pending'}
                </span>
              </InfoRow>
            )}
          </div>
        </Card>

        {/* Cover Note */}
        <Card className="p-6 border-gray-200 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Cover Note
          </h2>
          {application.coverNote ? (
            <p className="text-sm leading-relaxed text-gray-600">
              {application.coverNote}
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-400">
                No cover note provided
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Reviewer Notes */}
      {application.reviewerNotes && (
        <Card className="p-6 border-gray-200 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
            <MessageSquare className="h-4 w-4" />
            Reviewer Feedback
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            {application.reviewerNotes}
          </p>
        </Card>
      )}

      {/* Withdraw confirmation dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to withdraw your application for{' '}
            <strong>{application.opportunity.title}</strong>? This action cannot
            be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWithdrawDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              variant="destructive"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                'Withdraw'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
