import { describe, it, expect } from 'vitest';
import {
  overdueOutstanding,
  maintenanceStats,
  topActiveRequests,
} from '@/lib/dashboard-kpis';
import type { OverdueInvoiceRow, MaintenanceRequestResponse } from '@/types/api';

function overdue(balance: string): OverdueInvoiceRow {
  return {
    invoiceId: `inv-${balance}`,
    unitNumber: '1',
    renterName: 'r',
    dueDate: '2026-01-01',
    invoiced: balance,
    paid: '0.00',
    balance,
    daysOverdue: 5,
  };
}

function req(
  overrides: Partial<MaintenanceRequestResponse> = {},
): MaintenanceRequestResponse {
  return {
    id: Math.random().toString(36).slice(2),
    orgId: 'o',
    buildingId: 'b',
    apartmentId: 'a',
    renterId: 'r',
    title: 't',
    status: 'open',
    priority: 'medium',
    apartmentUnitNumber: '1',
    renterName: 'r',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('overdueOutstanding', () => {
  it('returns 0 for undefined / empty', () => {
    expect(overdueOutstanding(undefined)).toBe(0);
    expect(overdueOutstanding([])).toBe(0);
  });

  it('sums balance strings as numbers', () => {
    expect(overdueOutstanding([overdue('100.50'), overdue('49.50')])).toBe(150);
  });

  it('ignores non-finite balances defensively', () => {
    expect(overdueOutstanding([overdue('100.00'), overdue('not-a-number')])).toBe(
      100,
    );
  });
});

describe('maintenanceStats', () => {
  it('returns all-zero for undefined / empty', () => {
    expect(maintenanceStats(undefined)).toEqual({
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      active: 0,
      activeUrgent: 0,
    });
  });

  it('counts by status and derives active = open + in_progress', () => {
    const stats = maintenanceStats([
      req({ status: 'open' }),
      req({ status: 'open' }),
      req({ status: 'in_progress' }),
      req({ status: 'resolved' }),
      req({ status: 'closed' }),
    ]);
    expect(stats.open).toBe(2);
    expect(stats.inProgress).toBe(1);
    expect(stats.resolved).toBe(1);
    expect(stats.closed).toBe(1);
    expect(stats.active).toBe(3);
  });

  it('counts urgent only among active (open/in_progress) requests', () => {
    const stats = maintenanceStats([
      req({ status: 'open', priority: 'urgent' }),
      req({ status: 'in_progress', priority: 'urgent' }),
      req({ status: 'resolved', priority: 'urgent' }), // resolved → not active
      req({ status: 'open', priority: 'low' }),
    ]);
    expect(stats.activeUrgent).toBe(2);
  });
});

describe('topActiveRequests', () => {
  it('excludes resolved/closed and orders urgent→high→medium→low', () => {
    const list = [
      req({ id: 'low', status: 'open', priority: 'low' }),
      req({ id: 'urgent', status: 'open', priority: 'urgent' }),
      req({ id: 'closed', status: 'closed', priority: 'urgent' }),
      req({ id: 'high', status: 'in_progress', priority: 'high' }),
    ];
    const top = topActiveRequests(list);
    expect(top.map((r) => r.id)).toEqual(['urgent', 'high', 'low']);
  });

  it('breaks priority ties by newest createdAt first', () => {
    const list = [
      req({ id: 'older', priority: 'high', createdAt: '2026-07-01T00:00:00Z' }),
      req({ id: 'newer', priority: 'high', createdAt: '2026-07-10T00:00:00Z' }),
    ];
    expect(topActiveRequests(list).map((r) => r.id)).toEqual(['newer', 'older']);
  });

  it('respects the limit and does not mutate the input', () => {
    const list = [
      req({ priority: 'urgent' }),
      req({ priority: 'high' }),
      req({ priority: 'low' }),
    ];
    const snapshot = [...list];
    expect(topActiveRequests(list, 2)).toHaveLength(2);
    expect(list).toEqual(snapshot);
  });
});
