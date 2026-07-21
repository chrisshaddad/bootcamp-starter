'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  UserCheck,
  StickyNote,
  Bookmark,
  Send,
  Ban,
  CheckCircle,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  useSavedCandidates,
  useUpdateCandidate,
} from '@/hooks/use-saved-candidates';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CandidateStatus } from '@repo/contracts';
import { toast } from 'sonner';

// Configurations for pipeline stages
const PIPELINE_STAGES: Record<
  CandidateStatus,
  {
    label: string;
    icon: typeof Bookmark;
    color: string;
    borderColor: string;
    description: string;
  }
> = {
  SAVED: {
    label: 'Saved',
    icon: Bookmark,
    color: 'bg-muted text-muted-foreground',
    borderColor: 'border-border/60',
    description: 'Candidates bookmarked for future evaluation.',
  },
  CONTACTED: {
    label: 'Contacted',
    icon: Send,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    description: 'Initial outreach or interview scheduling is in progress.',
  },
  ACCEPTED: {
    label: 'Accepted',
    icon: CheckCircle,
    color:
      'bg-success/20 text-success-dark dark:bg-success/10 dark:text-success',
    borderColor: 'border-success/30 dark:border-success/20',
    description: 'Hired, extended offers, or approved candidates.',
  },
  REJECTED: {
    label: 'Rejected',
    icon: Ban,
    color: 'bg-destructive/20 text-destructive dark:bg-destructive/10',
    borderColor: 'border-destructive/30 dark:border-destructive/20',
    description: 'Candidates archived or not selected at this time.',
  },
};

export default function SavedCandidatesPage() {
  const { savedCandidates, isLoading } = useSavedCandidates();
  const updateCandidate = useUpdateCandidate();

  // Tab/view state: 'ALL' displays the dashboard of pipeline squares,
  // individual CandidateStatus displays the list specifically for that stage.
  const [activeStage, setActiveStage] = useState<CandidateStatus | 'ALL'>(
    'ALL',
  );
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const handleStatusChange = async (
    candidateId: string,
    status: CandidateStatus,
  ) => {
    try {
      await updateCandidate(candidateId, status);
      toast.success('Pipeline status updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleSaveNote = async (candidateId: string) => {
    try {
      await updateCandidate(candidateId, undefined, noteText);
      toast.success('Note updated');
      setEditingNote(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update note');
    }
  };

  // Group candidates into stages for counts and preview avatars
  const candidatesByStage = (stage: CandidateStatus) => {
    return savedCandidates.filter((c) => c.status === stage);
  };

  // Filter candidates for single stage drill-down lists
  const activeCandidates =
    activeStage === 'ALL'
      ? savedCandidates
      : savedCandidates.filter((c) => c.status === activeStage);

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8">
      {/* Header and Back navigation */}
      <div className="flex flex-col gap-4">
        {activeStage !== 'ALL' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveStage('ALL')}
            className="w-fit -ml-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to pipeline stages
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeStage === 'ALL'
              ? 'Candidate Pipeline'
              : `${PIPELINE_STAGES[activeStage].label} Candidates`}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeStage === 'ALL'
              ? 'Manage your candidate pipelines and track your hiring pipeline steps.'
              : PIPELINE_STAGES[activeStage].description}
          </p>
        </div>
      </div>

      {savedCandidates.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center border-dashed">
          <UserCheck className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No candidates saved yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">
            Explore developers and save them to your pipeline to start tracking
            them here.
          </p>
          <Button asChild>
            <Link href="/users">Browse Profiles</Link>
          </Button>
        </Card>
      ) : activeStage === 'ALL' ? (
        /* ALL CATEGORIES BOARD VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.keys(PIPELINE_STAGES) as CandidateStatus[]).map(
            (stageKey) => {
              const config = PIPELINE_STAGES[stageKey];
              const stageCandidates = candidatesByStage(stageKey);
              const count = stageCandidates.length;

              return (
                <Card
                  key={stageKey}
                  onClick={() => setActiveStage(stageKey)}
                  className={`aspect-square flex flex-col justify-between p-6 rounded-2xl border ${config.borderColor} shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all group`}
                >
                  {/* Header inside the square */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${config.color}`}
                      >
                        {config.label}
                      </span>
                      <config.icon className="h-5 w-5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-5xl font-extrabold tracking-tight tabular-nums pt-3">
                      {count}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {count === 1 ? 'candidate' : 'candidates'}
                    </p>
                  </div>

                  {/* Bottom of the square: Avatars Preview + Expand Action */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
                    <div className="flex -space-x-2 overflow-hidden">
                      {stageCandidates.slice(0, 4).map((record) => (
                        <Avatar
                          key={record.id}
                          className="inline-block h-7 w-7 ring-2 ring-background"
                        >
                          <AvatarImage
                            src={record.candidate.profilePictureUrl || ''}
                            alt={record.candidate.displayName}
                          />
                          <AvatarFallback className="text-[9px]">
                            {record.candidate.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {count > 4 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[9px] font-bold ring-2 ring-background">
                          +{count - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 group-hover:underline">
                      Expand
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Card>
              );
            },
          )}
        </div>
      ) : (
        /* SINGLE EXPANDED PIPELINE VIEW */
        <div className="space-y-4">
          {activeCandidates.length === 0 ? (
            <Card className="flex flex-col items-center py-16 text-center border-dashed">
              <Sparkles className="h-10 w-10 text-muted-foreground/80 mb-4" />
              <h3 className="text-lg font-semibold">
                No candidates in this stage
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">
                You do not have any candidates labeled as &quot;
                {PIPELINE_STAGES[activeStage].label}&quot;.
              </p>
              <Button variant="outline" onClick={() => setActiveStage('ALL')}>
                View Entire Pipeline
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeCandidates.map((record) => {
                const profile = record.candidate;
                const isEditing = editingNote === record.candidateId;

                return (
                  <Card
                    key={record.id}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6"
                  >
                    <Link
                      href={`/developers/${profile.publicSlug}`}
                      className="flex-shrink-0"
                    >
                      <Avatar className="h-20 w-20 border-2">
                        <AvatarImage
                          src={profile.profilePictureUrl || ''}
                          alt={profile.displayName}
                        />
                        <AvatarFallback className="text-xl">
                          {profile.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <Link
                            href={`/developers/${profile.publicSlug}`}
                            className="hover:underline"
                          >
                            <h3 className="text-lg font-bold">
                              {profile.displayName}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {profile.headline || 'Developer'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Select
                            value={record.status}
                            onValueChange={(val) =>
                              handleStatusChange(
                                record.candidateId,
                                val as CandidateStatus,
                              )
                            }
                          >
                            <SelectTrigger
                              className={`w-[140px] h-9 text-xs font-semibold ${PIPELINE_STAGES[record.status].color}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PIPELINE_STAGES).map(
                                ([key, config]) => (
                                  <SelectItem
                                    key={key}
                                    value={key}
                                    className="text-xs font-medium"
                                  >
                                    {config.label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="bg-accent/30 rounded-lg p-4 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <StickyNote className="h-4 w-4" />
                            <span>Evaluation Note</span>
                          </div>
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setNoteText(record.note || '');
                                setEditingNote(record.candidateId);
                              }}
                            >
                              {record.note ? 'Edit Note' : 'Add Note'}
                            </Button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Write your thoughts about this candidate..."
                              className="min-h-[80px] bg-background text-sm"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingNote(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleSaveNote(record.candidateId)
                                }
                              >
                                Save Note
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                            {record.note || (
                              <span className="italic text-muted-foreground/70">
                                No notes added yet.
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
