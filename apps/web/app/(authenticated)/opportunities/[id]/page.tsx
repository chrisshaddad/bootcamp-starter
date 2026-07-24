'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@/hooks/use-auth';
import { useOpportunity } from '@/hooks/use-opportunities';
import { useApplicationMutations } from '@/hooks/use-applications';
import { useSkillGap } from '@/hooks/use-skill-gaps';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { OPPORTUNITY_STATUS_TONE, toLabel } from '@/lib/labels';
import {
  applicationCreateRequestSchema,
  type ApplicationCreateRequest,
} from '@repo/contracts';

const LEVEL_LABELS: Record<number, string> = {
  1: 'entry level',
  2: 'junior level',
  3: 'mid level',
  4: 'senior level',
  5: 'lead level',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-5 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { user } = useUser({ redirectOnUnauthenticated: false });
  const { opportunity, isLoading, error } = useOpportunity(id);
  const { createApplication } = useApplicationMutations();
  const { skillGap, isLoading: isSkillGapLoading } = useSkillGap({
    employeeId: user?.id,
    opportunityId: id,
    enabled: !!user?.id,
  });

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  const form = useForm<ApplicationCreateRequest>({
    resolver: zodResolver(applicationCreateRequestSchema),
    defaultValues: {
      opportunityId: id,
      coverNote: '',
    },
  });

  const handleApply = form.handleSubmit(async (data) => {
    try {
      await createApplication({
        opportunityId: data.opportunityId,
        coverNote: data.coverNote?.trim() || undefined,
      });
      toast.success('Application submitted successfully!');
      setApplyDialogOpen(false);
      form.reset();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    }
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !opportunity) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/opportunities')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to opportunities
        </button>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <p className="text-sm text-gray-500">
            {error ? 'Failed to load opportunity' : 'Opportunity not found'}
          </p>
        </div>
      </div>
    );
  }

  const levelLabel = opportunity.requiredLevel
    ? (LEVEL_LABELS[opportunity.requiredLevel] ??
      `L${opportunity.requiredLevel}+`)
    : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/opportunities')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to opportunities
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {opportunity.title}
            </h1>
            <Badge tone="violet">{toLabel(opportunity.type)}</Badge>
            <Badge tone={OPPORTUNITY_STATUS_TONE[opportunity.status]}>
              {toLabel(opportunity.status)}
            </Badge>
          </div>

          {/* Subtitle */}
          {(opportunity.department || levelLabel) && (
            <p className="text-sm text-gray-500">
              {opportunity.department?.name}
              {opportunity.department && levelLabel ? ' · ' : ''}
              {levelLabel}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {opportunity.applicationCount} applicants
            </span>
            {opportunity.deadline && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {opportunity.status === 'OPEN' && (
          <Button
            onClick={() => setApplyDialogOpen(true)}
            className="bg-primary-base hover:bg-primary-base/90 shrink-0"
            size="lg"
          >
            Apply Now
          </Button>
        )}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          <Card className="p-6 border-gray-200 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              About this opportunity
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              {opportunity.description || 'No description provided.'}
            </p>
          </Card>

          {/* Required Skills */}
          <Card className="p-6 border-gray-200 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Required Skills
            </h2>
            {opportunity.requiredSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {opportunity.requiredSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
                  >
                    {skill.name}
                    <span className="text-xs font-medium text-gray-500">
                      L{skill.requiredLevel}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No specific skills required.
              </p>
            )}
          </Card>
        </div>

        {/* Right column — Fit Analysis */}
        <Card className="h-fit p-6 border-gray-200 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Your Fit Analysis
          </h2>

          {isSkillGapLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : skillGap ? (
            <>
              {/* Fit score */}
              <div className="mb-4">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-semibold',
                    skillGap.fitScore >= 70
                      ? 'border-success/30 text-success bg-success/10'
                      : skillGap.fitScore >= 40
                        ? 'border-warning/30 text-warning bg-warning/10'
                        : 'border-destructive/30 text-destructive bg-destructive/10',
                  )}
                >
                  {skillGap.fitScore}% fit
                </span>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      skillGap.fitScore >= 70
                        ? 'bg-success'
                        : skillGap.fitScore >= 40
                          ? 'bg-warning'
                          : 'bg-destructive',
                    )}
                    style={{ width: `${skillGap.fitScore}%` }}
                  />
                </div>
              </div>

              {/* Matched skills */}
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-gray-600">
                  You have ({skillGap.matchedSkills.length})
                </p>
                {skillGap.matchedSkills.length > 0 ? (
                  <div className="space-y-1.5">
                    {skillGap.matchedSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        <span className="text-gray-700">{skill.name}</span>
                        <span className="text-xs text-gray-400">
                          L{skill.proficiencyLevel}/L{skill.requiredLevel}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No matching skills yet
                  </p>
                )}
              </div>

              {/* Missing skills */}
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-gray-600">
                  Gaps to close ({skillGap.missingSkills.length})
                </p>
                {skillGap.missingSkills.length > 0 ? (
                  <div className="space-y-1.5">
                    {skillGap.missingSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                        <span className="text-gray-700">{skill.name}</span>
                        <span className="text-xs text-gray-400">
                          L{skill.proficiencyLevel ?? 0}/L{skill.requiredLevel}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No gaps — you meet all requirements!
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-400">
              <div className="flex gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  Add skills to your profile to see how you match this
                  opportunity.
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to {opportunity.title}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleApply}>
            <div className="space-y-2">
              <label
                htmlFor="coverNote"
                className="text-sm font-medium text-gray-700"
              >
                Cover note (optional)
              </label>
              <textarea
                id="coverNote"
                placeholder="Tell the team why you're a great fit..."
                rows={5}
                {...form.register('coverNote')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-gray-500 focus-visible:border-primary-base focus-visible:ring-[3px] focus-visible:ring-primary-base/20"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setApplyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-primary-base hover:bg-primary-base/90"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
