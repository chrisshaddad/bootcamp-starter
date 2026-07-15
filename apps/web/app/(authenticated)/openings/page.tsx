'use client';

import { useState } from 'react';
import {
  Calendar,
  FolderKanban,
  Pencil,
  Plus,
  ShieldX,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { OpportunityResponse, OpportunityStatus } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useOpportunities, useOpportunityMutations } from '@/hooks/use-opportunities';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OpportunityFormDialog } from '@/components/opportunity-form-dialog';
import { cn } from '@/lib/utils';

const TYPE_BADGE_COLORS: Record<string, string> = {
  ROLE: 'bg-primary-100 text-primary-base',
  PROJECT: 'bg-warning/20 text-warning-dark',
  ROTATION: 'bg-secondary-200 text-gray-700',
};

const TYPE_LABELS: Record<string, string> = {
  ROLE: 'Role',
  PROJECT: 'Project',
  ROTATION: 'Rotation',
};

const STATUS_BADGE_COLORS: Record<OpportunityStatus, string> = {
  OPEN: 'bg-success/15 text-success',
  CLOSED: 'bg-gray-100 text-gray-600',
  FILLED: 'bg-primary-100 text-primary-base',
};

const STATUS_OPTIONS: { label: string; value: OpportunityStatus }[] = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Filled', value: 'FILLED' },
];

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-red-400" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        Only managers can manage openings for their team.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function ManageOpeningsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { opportunities, isLoading } = useOpportunities({ mine: true });
  const { updateOpportunity, deleteOpportunity } = useOpportunityMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] =
    useState<OpportunityResponse | undefined>(undefined);
  const [deletingOpportunity, setDeletingOpportunity] =
    useState<OpportunityResponse | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isUserLoading) {
    return <LoadingSkeleton />;
  }

  if (!user?.isManager) {
    return <ForbiddenPage />;
  }

  const openCreateDialog = () => {
    setEditingOpportunity(undefined);
    setFormOpen(true);
  };

  const openEditDialog = (opportunity: OpportunityResponse) => {
    setEditingOpportunity(opportunity);
    setFormOpen(true);
  };

  const handleStatusChange = async (
    opportunity: OpportunityResponse,
    status: OpportunityStatus,
  ) => {
    try {
      await updateOpportunity(opportunity.id, { status });
      toast.success('Status updated');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingOpportunity) return;
    setIsDeleting(true);
    try {
      await deleteOpportunity(deletingOpportunity.id);
      toast.success('Opening deleted');
      setDeletingOpportunity(undefined);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manage Openings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage internal openings for your team
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-primary-base hover:bg-primary-base/90"
        >
          <Plus className="h-4 w-4" />
          New Opening
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !opportunities?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <FolderKanban className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            You don&apos;t have any openings yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <Card
              key={opportunity.id}
              className="gap-3 border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">
                    {opportunity.title}
                  </h2>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      TYPE_BADGE_COLORS[opportunity.type],
                    )}
                  >
                    {TYPE_LABELS[opportunity.type]}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      STATUS_BADGE_COLORS[opportunity.status],
                    )}
                  >
                    {
                      STATUS_OPTIONS.find(
                        (s) => s.value === opportunity.status,
                      )?.label
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={opportunity.status}
                    onValueChange={(status) =>
                      handleStatusChange(opportunity, status as OpportunityStatus)
                    }
                  >
                    <SelectTrigger className="h-9 w-32 rounded-lg border-gray-200 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(opportunity)}
                    aria-label="Edit opening"
                  >
                    <Pencil className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDeletingOpportunity(opportunity)}
                    aria-label="Delete opening"
                  >
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </div>

              {opportunity.department && (
                <p className="text-sm text-gray-500">
                  {opportunity.department.name}
                </p>
              )}

              {opportunity.description && (
                <p className="line-clamp-2 text-sm text-gray-600">
                  {opportunity.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {opportunity.applicationCount} applicants
                </span>
                {opportunity.deadline && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(opportunity.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <OpportunityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        opportunity={editingOpportunity}
      />

      <Dialog
        open={!!deletingOpportunity}
        onOpenChange={(open) => !open && setDeletingOpportunity(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete opening?</DialogTitle>
            <DialogDescription>
              {deletingOpportunity && deletingOpportunity.applicationCount > 0
                ? `This opening has ${deletingOpportunity.applicationCount} application(s) and can't be deleted until they're resolved.`
                : "This can't be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingOpportunity(undefined)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                isDeleting ||
                (deletingOpportunity && deletingOpportunity.applicationCount > 0)
              }
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
