import { describe, it, expect } from 'vitest';
import {
  canOpenRequest,
  hasOutstanding,
  balanceTone,
} from '@/lib/tenant-overview';
import type { TenantOverviewResponse } from '@/types/api';

function overview(
  overrides: Partial<TenantOverviewResponse> = {},
): TenantOverviewResponse {
  return {
    linked: true,
    renter: { id: 'r1', fullName: 'Jane', email: null, phone: null },
    lease: {
      id: 'l1',
      buildingId: 'b1',
      buildingName: 'Tower',
      unitNumber: '4B',
      startDate: '2026-01-01',
      endDate: '2099-01-01',
      rentAmount: '1000.00',
      depositAmount: '1000.00',
      status: 'active',
      effectiveStatus: 'active',
    },
    balance: { invoiced: '0.00', paid: '0.00', outstanding: '0.00' },
    invoices: [],
    maintenanceRequests: [],
    ...overrides,
  };
}

describe('canOpenRequest', () => {
  it('true for a linked tenant with an effectively-active lease', () => {
    expect(canOpenRequest(overview())).toBe(true);
  });

  it('false when not linked', () => {
    expect(canOpenRequest(overview({ linked: false, lease: null }))).toBe(false);
  });

  it('false when the lease is not effectively active (e.g. expired)', () => {
    const o = overview();
    o.lease!.effectiveStatus = 'expired';
    expect(canOpenRequest(o)).toBe(false);
  });

  it('false when there is no lease', () => {
    expect(canOpenRequest(overview({ lease: null }))).toBe(false);
  });

  it('false for undefined/null input', () => {
    expect(canOpenRequest(undefined)).toBe(false);
    expect(canOpenRequest(null)).toBe(false);
  });
});

describe('hasOutstanding / balanceTone', () => {
  it('detects a positive outstanding balance', () => {
    expect(hasOutstanding('600.00')).toBe(true);
    expect(balanceTone('600.00')).toBe('negative');
  });

  it('treats a zero balance as settled (positive tone)', () => {
    expect(hasOutstanding('0.00')).toBe(false);
    expect(balanceTone('0.00')).toBe('positive');
    expect(balanceTone(undefined)).toBe('positive');
  });

  it('ignores sub-cent noise', () => {
    expect(hasOutstanding('0.004')).toBe(false);
  });
});
