import { describe, expect, it } from 'vitest';

import { getNotificationHref } from '@/lib/notification-target';
import type { NotificationResponse } from '@/types/api';

function notification(
  overrides: Partial<NotificationResponse> = {},
): NotificationResponse {
  return {
    id: 'n-1',
    orgId: 'org-1',
    userId: 'user-1',
    type: 'maintenance_request.created',
    title: 'New maintenance request',
    body: null,
    data: {},
    readAt: null,
    createdAt: '2026-07-26T10:00:00.000Z',
    ...overrides,
  } as NotificationResponse;
}

describe('getNotificationHref', () => {
  it('deep-links an admin to the specific request in the Tasks register', () => {
    const n = notification({ data: { requestId: 'mr-1' } });

    expect(getNotificationHref(n, 'en', 'dashboard')).toBe(
      '/en/dashboard/tasks/mr-1',
    );
  });

  it('falls back to the Tasks list when the payload carries no requestId', () => {
    const n = notification({ type: 'maintenance_request.resolved', data: {} });

    expect(getNotificationHref(n, 'en', 'dashboard')).toBe(
      '/en/dashboard/tasks',
    );
  });

  it('sends an admin to the support inbox for ticket notifications', () => {
    const n = notification({
      type: 'support_ticket.created',
      data: { ticketId: 't-1' },
    });

    expect(getNotificationHref(n, 'ar', 'dashboard')).toBe(
      '/ar/dashboard/support',
    );
  });

  // A tenant has no access to /dashboard/* at all — both kinds of notification
  // must land on their own portal page instead.
  it('keeps a tenant inside the portal for both requests and tickets', () => {
    const request = notification({ data: { requestId: 'mr-1' } });
    const ticket = notification({
      type: 'support_ticket.resolved',
      data: { ticketId: 't-1' },
    });

    expect(getNotificationHref(request, 'en', 'portal')).toBe(
      '/en/portal/support',
    );
    expect(getNotificationHref(ticket, 'ar', 'portal')).toBe(
      '/ar/portal/support',
    );
  });

  // Work orders have no route of their own — they render on the request that
  // owns them, so the notification must resolve through maintenanceRequestId.
  it('routes a work-order notification to its owning request', () => {
    const n = notification({
      type: 'work_order.assigned',
      data: { workOrderId: 'wo-1', maintenanceRequestId: 'mr-7' },
    });

    expect(getNotificationHref(n, 'en', 'dashboard')).toBe(
      '/en/dashboard/tasks/mr-7',
    );
  });

  it('routes invoice and lease notifications on the dashboard', () => {
    const invoice = notification({
      type: 'invoice.payment_recorded',
      data: { invoiceId: 'inv-1', paymentId: 'p-1' },
    });
    const lease = notification({
      type: 'lease.created',
      data: { leaseId: 'l-1', apartmentId: 'a-1' },
    });

    expect(getNotificationHref(invoice, 'en', 'dashboard')).toBe(
      '/en/dashboard/invoices/inv-1',
    );
    expect(getNotificationHref(lease, 'en', 'dashboard')).toBe(
      '/en/dashboard/leases',
    );
  });

  it('sends a tenant lease notification to portal home, and leaves invoices unclickable', () => {
    const lease = notification({
      type: 'lease.created',
      data: { leaseId: 'l-1' },
    });
    const invoice = notification({
      type: 'invoice.issued',
      data: { invoiceId: 'inv-1' },
    });

    expect(getNotificationHref(lease, 'en', 'portal')).toBe('/en/portal');
    // No tenant-facing invoice page exists yet — better inert than a dead end.
    expect(getNotificationHref(invoice, 'en', 'portal')).toBeNull();
  });

  it('returns null for a type with no known destination', () => {
    const n = notification({ type: 'org.plan_changed', data: {} });

    expect(getNotificationHref(n, 'en', 'dashboard')).toBeNull();
    expect(getNotificationHref(n, 'en', 'portal')).toBeNull();
  });

  it('ignores a non-string or empty id in the payload', () => {
    const n = notification({
      type: 'billing.something',
      data: { requestId: 42 },
    });

    expect(getNotificationHref(n, 'en', 'dashboard')).toBeNull();
  });
});
