'use client';

import { useState } from 'react';
import {
  Calendar,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { OpportunityResponse, OpportunityStatus } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import {
  useOpportunitiesInfinite,
  useOpportunityMutations,
} from '@/hooks/use-opportunities';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ForbiddenPage } from '@/components/forbidden-page';
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
import {
  OPPORTUNITY_STATUS_TONE,
  OPPORTUNITY_TYPE_TONE,
  toLabel,
} from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { OpportunityType } from '@repo/contracts';

// Literal class strings (not built dynamically) so Tailwind's scanner picks
// them up - mirrors OPPORTUNITY_TYPE_TONE's category coloring as a left
// border accent per row.
const TYPE_BORDER_ACCENT: Record<OpportunityType, string> = {
  ROLE: 'border-l-violet',
  PROJECT: 'border-l-warning',
  ROTATION: 'border-l-blush',
};

const STATUS_OPTIONS: { label: string; value: OpportunityStatus }[] = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Filled', value: 'FILLED' },
];

// Deadlines are date-only values stored at UTC midnight; format in UTC so the
// displayed day doesn't shift for users west of UTC (toLocaleDateString would
// convert to the browser's local timezone and can show the prior calendar day).
const DEADLINE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function formatDeadline(deadline: string | Date): string {
  return DEADLINE_FORMATTER.format(new Date(deadline));
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
  const { opportunities, isLoading, hasMore, isLoadingMore, loadMore, error } =
    useOpportunitiesInfinite({ mine: true });
  const { updateOpportunity, deleteOpportunity } = useOpportunityMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<
    OpportunityResponse | undefined
  >(undefined);
  const [deletingOpportunity, setDeletingOpportunity] = useState<
    OpportunityResponse | undefined
  >(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isUserLoading) {
    return <LoadingSkeleton />;
  }

  if (!user?.isManager && user?.role !== 'ORG_ADMIN') {
    return (
      <ForbiddenPage message="Only managers and org admins can manage openings." />
    );
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
          <h1 className="text-2xl font-bold text-foreground">
            Manage Openings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage internal openings for your team
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          New Opening
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="py-10 text-center text-destructive">
          Failed to load openings
        </div>
      ) : !opportunities?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            You don&apos;t have any openings yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <Card
              key={opportunity.id}
              className={cn(
                'gap-3 border-l-4 p-5 shadow-sm',
                TYPE_BORDER_ACCENT[opportunity.type],
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {opportunity.title}
                  </h2>
                  <Badge tone={OPPORTUNITY_TYPE_TONE[opportunity.type]}>
                    {toLabel(opportunity.type)}
                  </Badge>
                  <Badge tone={OPPORTUNITY_STATUS_TONE[opportunity.status]}>
                    {toLabel(opportunity.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={opportunity.status}
                    onValueChange={(status) =>
                      handleStatusChange(
                        opportunity,
                        status as OpportunityStatus,
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-32 rounded-lg text-sm">
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
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDeletingOpportunity(opportunity)}
                    aria-label="Delete opening"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {opportunity.department && (
                <p className="text-sm text-muted-foreground">
                  {opportunity.department.name}
                </p>
              )}

              {opportunity.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {opportunity.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {opportunity.applicationCount} applicants
                </span>
                {opportunity.deadline && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDeadline(opportunity.deadline)}
                  </span>
                )}
              </div>
            </Card>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="h-9 rounded-lg px-4 text-sm font-medium"
              >
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
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
                (deletingOpportunity &&
                  deletingOpportunity.applicationCount > 0)
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
