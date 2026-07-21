'use client';

import { useState } from 'react';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useSavedCandidates,
  useSaveCandidate,
  useUnsaveCandidate,
} from '@/hooks/use-saved-candidates';
import { toast } from 'sonner';

interface SaveCandidateButtonProps {
  candidateId: string;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SaveCandidateButton({
  candidateId,
  variant = 'outline',
  size = 'sm',
  className = '',
}: SaveCandidateButtonProps) {
  const { savedCandidates, isLoading } = useSavedCandidates();
  const save = useSaveCandidate();
  const unsave = useUnsaveCandidate();
  const [isPending, setIsPending] = useState(false);

  const isSaved = savedCandidates.some((c) => c.candidateId === candidateId);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    setIsPending(true);
    try {
      if (isSaved) {
        await unsave(candidateId);
        toast.success('Candidate removed from pipeline');
      } else {
        await save(candidateId);
        toast.success('Candidate saved to pipeline');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update saved candidate',
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={isSaved ? 'secondary' : variant}
      size={size}
      className={className}
      onClick={toggleSave}
      disabled={isLoading || isPending}
    >
      {isSaved ? (
        <BookmarkCheck className="h-4 w-4 mr-2" />
      ) : (
        <BookmarkPlus className="h-4 w-4 mr-2" />
      )}
      {isSaved ? 'Saved' : 'Save Candidate'}
    </Button>
  );
}
