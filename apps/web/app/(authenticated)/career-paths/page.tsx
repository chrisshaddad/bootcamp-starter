'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  Loader2,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCareerPaths, useCareerPathMutations } from '@/hooks/use-career-paths';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const TIMEFRAME_OPTIONS = [
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
  { value: '24', label: '24 months' },
];

const TIMEFRAME_COLORS: Record<number, string> = {
  6: 'bg-green-100 text-green-700',
  12: 'bg-blue-100 text-blue-700',
  24: 'bg-purple-100 text-purple-700',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function CareerPathsPage() {
  const { careerPaths, isLoading, error } = useCareerPaths();
  const { createCareerPath, deleteCareerPath } = useCareerPathMutations();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState('');
  const [timeframe, setTimeframe] = useState('12');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = async () => {
    if (!targetTitle.trim()) {
      toast.error('Please enter a target role');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCareerPath({
        targetTitle: targetTitle.trim(),
        timeframeMonths: Number(timeframe) as 6 | 12 | 24,
      });
      toast.success('Career path created!');
      setCreateDialogOpen(false);
      setTargetTitle('');
      setTimeframe('12');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to create career path. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPathId) return;

    setIsDeleting(true);
    try {
      await deleteCareerPath(selectedPathId);
      toast.success('Career path deleted');
      setDeleteDialogOpen(false);
      setSelectedPathId(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to delete career path. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedPath = careerPaths?.find((p) => p.id === selectedPathId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Career Paths</h1>
          <p className="mt-1 text-sm text-gray-500">
            Plan and track your progression toward future roles
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-primary-base hover:bg-primary-base/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Career Path
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="py-10 text-center text-red-500">
          Failed to load career paths
        </div>
      ) : !careerPaths?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <TrendingUp className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            No career paths yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Create your first career path to start planning your growth
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {careerPaths.map((path) => (
            <Card
              key={path.id}
              className="gap-3 p-5 border-gray-200 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Target className="h-4 w-4 text-gray-400" />
                  <h2 className="text-base font-semibold text-gray-900">
                    {path.targetTitle}
                  </h2>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      TIMEFRAME_COLORS[path.timeframeMonths] ??
                        'bg-gray-100 text-gray-600',
                    )}
                  >
                    {path.timeframeMonths} months
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPathId(path.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {path.timeframeMonths}-month plan
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Created{' '}
                  {new Date(path.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Milestones placeholder */}
              {Array.isArray(path.milestones) &&
              (path.milestones as unknown[]).length > 0 ? (
                <div className="mt-2 text-sm text-gray-600">
                  {(path.milestones as unknown[]).length} milestones
                </div>
              ) : (
                <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
                  AI-generated milestones and learning recommendations will
                  appear here once available.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Career Path</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="targetTitle"
                className="text-sm font-medium text-gray-700"
              >
                Target Role
              </label>
              <Input
                id="targetTitle"
                placeholder="e.g. Senior Product Manager"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="timeframe"
                className="text-sm font-medium text-gray-700"
              >
                Timeframe
              </label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger
                  id="timeframe"
                  className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
                >
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="bg-primary-base hover:bg-primary-base/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Path'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Career Path</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete your career path for{' '}
            <strong>{selectedPath?.targetTitle}</strong>? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
