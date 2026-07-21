'use client';

import { useUser } from '@/hooks/use-auth';
import { SaveCandidateButton } from '@/components/save-candidate-button';

export function DeveloperSaveCandidate({ userId }: { userId: string }) {
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: false });

  if (isLoading) return null;

  const isAuthorized =
    user?.accountType === 'HIRING' || user?.accountType === 'SUPER_ADMIN';

  if (!isAuthorized) return null;

  return (
    <SaveCandidateButton candidateId={userId} variant="default" size="sm" />
  );
}
