/**
 * Pure, framework-free derivations for the tenant dashboard (Sprint T1).
 * Kept out of the component so the branching logic can be unit-tested without
 * rendering. All monetary inputs are the bare decimal strings the API returns
 * (e.g. "600.00"); see TenantOverviewResponse.
 */
import type { TenantOverviewResponse } from '@/types/api';

/**
 * A tenant may only open a maintenance request when they are linked AND their
 * lease is effectively active — mirrors the server rule in TenantService
 * (a past/expired lease has no apartment to scope a new request to).
 */
export function canOpenRequest(
  overview: Pick<TenantOverviewResponse, 'linked' | 'lease'> | undefined | null,
): boolean {
  return Boolean(
    overview?.linked && overview.lease?.effectiveStatus === 'active',
  );
}

/** True when the outstanding balance is greater than zero. */
export function hasOutstanding(outstanding: string | undefined): boolean {
  return parseFloat(outstanding ?? '0') > 0.005;
}

/**
 * Tone for the outstanding-balance tile: money owed reads as "negative"
 * (attention), a zero balance reads as "positive" (all paid up).
 */
export function balanceTone(
  outstanding: string | undefined,
): 'positive' | 'negative' {
  return hasOutstanding(outstanding) ? 'negative' : 'positive';
}
