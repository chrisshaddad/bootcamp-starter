'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import type {
  MemberActionResponse,
  MemberCreateRequest,
  MemberInvitationActionResponse,
  MemberInvitationListResponse,
  MemberInviteRequest,
  MemberListResponse,
  MemberUpdateRequest,
} from '@repo/contracts';

interface UseMembersOptions {
  enabled?: boolean;
  organizationId?: string;
}

interface UseMembersReturn {
  members: MemberListResponse['members'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  createMember: (body: MemberCreateRequest) => Promise<MemberActionResponse>;
  updateMember: (
    id: string,
    body: MemberUpdateRequest,
  ) => Promise<MemberActionResponse>;
  deleteMember: (id: string) => Promise<MemberActionResponse>;
  mutate: () => void;
}

/**
 * Builds a members API endpoint with an optional organization filter.
 */
function buildMembersEndpoint(base: string, organizationId?: string): string {
  if (!organizationId) {
    return base;
  }

  const params = new URLSearchParams({ organizationId });
  return `${base}?${params.toString()}`;
}

export function useMembers(options: UseMembersOptions = {}): UseMembersReturn {
  const { enabled = true, organizationId } = options;
  const endpoint = buildMembersEndpoint('/members', organizationId);

  const { data, error, isLoading } = useSWR<MemberListResponse>(
    enabled ? endpoint : null,
  );

  /**
   * Revalidates all cached member and invitation lists.
   */
  const invalidateMembers = useCallback(() => {
    mutate((key) => typeof key === 'string' && key.startsWith('/members'));
  }, []);

  /**
   * Creates a member and refreshes member-related caches.
   */
  const createMember = useCallback(
    async (body: MemberCreateRequest) => {
      const result = await apiPost<MemberActionResponse>('/members', body);
      invalidateMembers();
      return result;
    },
    [invalidateMembers],
  );

  /**
   * Updates a member and refreshes member-related caches.
   */
  const updateMember = useCallback(
    async (id: string, body: MemberUpdateRequest) => {
      const result = await apiPatch<MemberActionResponse>(
        `/members/${id}`,
        body,
      );
      invalidateMembers();
      return result;
    },
    [invalidateMembers],
  );

  /**
   * Deletes a member and refreshes member-related caches.
   */
  const deleteMember = useCallback(
    async (id: string) => {
      const result = await apiDelete<MemberActionResponse>(`/members/${id}`);
      invalidateMembers();
      return result;
    },
    [invalidateMembers],
  );

  return {
    members: data?.members,
    total: data?.total,
    isLoading,
    error,
    createMember,
    updateMember,
    deleteMember,
    mutate: invalidateMembers,
  };
}

interface UseMemberInvitationsReturn {
  invitations: MemberInvitationListResponse['invitations'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  inviteMember: (
    body: MemberInviteRequest,
  ) => Promise<MemberInvitationActionResponse>;
  resendInvitation: (id: string) => Promise<MemberInvitationActionResponse>;
  revokeInvitation: (id: string) => Promise<MemberInvitationActionResponse>;
  mutate: () => void;
}

/**
 * Fetches pending invitations and exposes invitation mutation helpers.
 */
export function useMemberInvitations(
  options: UseMembersOptions = {},
): UseMemberInvitationsReturn {
  const { enabled = true, organizationId } = options;
  const endpoint = buildMembersEndpoint('/members/invitations', organizationId);

  const { data, error, isLoading } = useSWR<MemberInvitationListResponse>(
    enabled ? endpoint : null,
  );

  /**
   * Revalidates all cached member and invitation lists.
   */
  const invalidateInvitations = useCallback(() => {
    mutate((key) => typeof key === 'string' && key.startsWith('/members'));
  }, []);

  /**
   * Sends an invitation and refreshes member-related caches.
   */
  const inviteMember = useCallback(
    async (body: MemberInviteRequest) => {
      const result = await apiPost<MemberInvitationActionResponse>(
        '/members/invitations',
        body,
      );
      invalidateInvitations();
      return result;
    },
    [invalidateInvitations],
  );

  /**
   * Resends an invitation and refreshes member-related caches.
   */
  const resendInvitation = useCallback(
    async (id: string) => {
      const result = await apiPost<MemberInvitationActionResponse>(
        `/members/invitations/${id}/resend`,
      );
      invalidateInvitations();
      return result;
    },
    [invalidateInvitations],
  );

  /**
   * Revokes an invitation and refreshes member-related caches.
   */
  const revokeInvitation = useCallback(
    async (id: string) => {
      const result = await apiDelete<MemberInvitationActionResponse>(
        `/members/invitations/${id}`,
      );
      invalidateInvitations();
      return result;
    },
    [invalidateInvitations],
  );

  return {
    invitations: data?.invitations,
    total: data?.total,
    isLoading,
    error,
    inviteMember,
    resendInvitation,
    revokeInvitation,
    mutate: invalidateInvitations,
  };
}
