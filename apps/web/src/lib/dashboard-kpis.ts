/**
 * dashboard-kpis.ts — pure derivations feeding the role dashboards (Sprint D1).
 *
 * These are the only pieces of *logic* on the dashboards: everything financial
 * (MTD income / expenses / net, occupancy) is already computed server-side by the
 * reports module and arrives pre-aggregated. What the client still derives is:
 *   - the total outstanding balance across overdue invoices, and
 *   - status/priority counts over the flat maintenance-request list (the one
 *     org-wide list a supervisor *and* a maintenance user can both read).
 * Kept pure + framework-free so they can be unit-tested in isolation.
 */

import type { OverdueInvoiceRow, MaintenanceRequestResponse } from '@/types/api';

/** Sum of the outstanding balance across overdue invoices (money strings → number). */
export function overdueOutstanding(rows: OverdueInvoiceRow[] | undefined): number {
  if (!rows?.length) return 0;
  return rows.reduce((sum, row) => {
    const n = Number(row.balance);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export interface MaintenanceStats {
  /** status === 'open' */
  open: number;
  /** status === 'in_progress' */
  inProgress: number;
  /** status === 'resolved' */
  resolved: number;
  /** status === 'closed' */
  closed: number;
  /** open + in_progress — the work that still needs attention */
  active: number;
  /** active requests whose priority is 'urgent' */
  activeUrgent: number;
}

/**
 * Counts maintenance requests by status, plus a couple of derived aggregates
 * the staff dashboard leads with. "active" = anything not yet resolved/closed.
 */
export function maintenanceStats(
  list: MaintenanceRequestResponse[] | undefined,
): MaintenanceStats {
  const stats: MaintenanceStats = {
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    active: 0,
    activeUrgent: 0,
  };
  if (!list?.length) return stats;

  for (const req of list) {
    switch (req.status) {
      case 'open':
        stats.open += 1;
        break;
      case 'in_progress':
        stats.inProgress += 1;
        break;
      case 'resolved':
        stats.resolved += 1;
        break;
      case 'closed':
        stats.closed += 1;
        break;
    }
    const isActive = req.status === 'open' || req.status === 'in_progress';
    if (isActive && req.priority === 'urgent') stats.activeUrgent += 1;
  }
  stats.active = stats.open + stats.inProgress;
  return stats;
}

/**
 * The most-pressing active requests first (urgent → high → medium → low, then
 * newest), for the staff dashboard's "needs attention" shortlist. Non-mutating.
 */
export function topActiveRequests(
  list: MaintenanceRequestResponse[] | undefined,
  limit = 5,
): MaintenanceRequestResponse[] {
  if (!list?.length) return [];
  const priorityRank: Record<MaintenanceRequestResponse['priority'], number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return list
    .filter((r) => r.status === 'open' || r.status === 'in_progress')
    .slice()
    .sort((a, b) => {
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
      // newest first as a tiebreaker
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit);
}
