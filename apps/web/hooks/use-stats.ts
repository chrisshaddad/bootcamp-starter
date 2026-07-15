'use client';

import useSWR from 'swr';
import type {
  StatsEventDetailResponse,
  StatsEventListResponse,
  StatsMemberListResponse,
  StatsOverviewResponse,
  StatsUserDetailResponse,
  StatsUserListResponse,
} from '@repo/contracts';

interface StatsScopeOptions {
  enabled?: boolean;
  organizationId?: string;
}

function withOrg(base: string, organizationId?: string): string {
  if (!organizationId) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}organizationId=${organizationId}`;
}

export function useStatsOverview(options: StatsScopeOptions = {}) {
  const { enabled = true, organizationId } = options;
  const { data, error, isLoading, mutate } = useSWR<StatsOverviewResponse>(
    enabled ? withOrg('/stats/overview', organizationId) : null,
  );

  return { overview: data, isLoading, error, mutate };
}

export function useStatsEvents(options: StatsScopeOptions = {}) {
  const { enabled = true, organizationId } = options;
  const { data, error, isLoading, mutate } = useSWR<StatsEventListResponse>(
    enabled ? withOrg('/stats/events', organizationId) : null,
  );

  return {
    events: data?.events,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

export function useStatsUsers(options: StatsScopeOptions = {}) {
  const { enabled = true, organizationId } = options;
  const { data, error, isLoading, mutate } = useSWR<StatsUserListResponse>(
    enabled ? withOrg('/stats/users', organizationId) : null,
  );

  return {
    users: data?.users,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

export function useStatsMembers(options: StatsScopeOptions = {}) {
  const { enabled = true, organizationId } = options;
  const { data, error, isLoading, mutate } = useSWR<StatsMemberListResponse>(
    enabled ? withOrg('/stats/members', organizationId) : null,
  );

  return {
    members: data?.members,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

export function useStatsEvent(
  eventId: string,
  options: StatsScopeOptions = {},
) {
  const { enabled = true } = options;
  const { data, error, isLoading, mutate } = useSWR<StatsEventDetailResponse>(
    enabled && eventId ? `/stats/events/${eventId}` : null,
  );

  return { stats: data, isLoading, error, mutate };
}

export function useStatsUser(userId: string, options: StatsScopeOptions = {}) {
  const { enabled = true, organizationId } = options;
  const { data, error, isLoading, mutate } = useSWR<StatsUserDetailResponse>(
    enabled && userId
      ? withOrg(`/stats/users/${userId}`, organizationId)
      : null,
  );

  return { user: data, isLoading, error, mutate };
}
