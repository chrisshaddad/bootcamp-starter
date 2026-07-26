import { describe, expect, it } from 'vitest';

import en from '@/i18n/dictionaries/en.json';
import ar from '@/i18n/dictionaries/ar.json';
import { getNotificationContent } from '@/lib/notification-content';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { NotificationResponse } from '@/types/api';

const EN = en as unknown as Dictionary;
const AR = ar as unknown as Dictionary;

function notification(
  overrides: Partial<NotificationResponse> = {},
): NotificationResponse {
  return {
    id: 'n-1',
    orgId: 'org-1',
    userId: 'user-1',
    type: 'maintenance_request.created',
    // The API stores English on the row; these are the fallback strings.
    title: 'New maintenance request',
    body: 'Jane Doe (unit 4B) reported: "No hot water".',
    data: {},
    readAt: null,
    createdAt: '2026-07-26T10:00:00.000Z',
    ...overrides,
  } as NotificationResponse;
}

describe('getNotificationContent', () => {
  it('renders a new-request notification from the dictionary, interpolating params', () => {
    const n = notification({
      data: {
        requestId: 'mr-1',
        requestTitle: 'No hot water',
        renterName: 'Jane Doe',
        unitNumber: '4B',
      },
    });

    expect(getNotificationContent(n, EN)).toEqual({
      title: 'New maintenance request',
      body: 'Jane Doe (unit 4B) reported: "No hot water".',
    });
  });

  it('renders the same notification in Arabic', () => {
    const n = notification({
      data: {
        requestId: 'mr-1',
        requestTitle: 'لا يوجد ماء ساخن',
        renterName: 'جين',
        unitNumber: '4B',
      },
    });

    const content = getNotificationContent(n, AR);
    expect(content.title).toBe('طلب صيانة جديد');
    expect(content.body).toContain('جين');
    expect(content.body).toContain('لا يوجد ماء ساخن');
    // Must not leak the raw placeholder syntax.
    expect(content.body).not.toContain('{');
  });

  it('localizes the status label in a status-change notification', () => {
    const n = notification({
      type: 'maintenance_request.in_progress',
      title: 'Maintenance request in progress',
      body: 'Your request "Leaky tap" is now in progress.',
      data: {
        requestId: 'mr-1',
        status: 'in_progress',
        requestTitle: 'Leaky tap',
      },
    });

    // The status word comes from tasks.status, not from the raw enum.
    expect(getNotificationContent(n, EN).body).toBe(
      'Your request "Leaky tap" is now In progress.',
    );
    expect(getNotificationContent(n, AR).body).toContain('قيد التنفيذ');
  });

  it('renders support-ticket notifications', () => {
    const created = notification({
      type: 'support_ticket.created',
      title: 'New support ticket',
      body: 'x',
      data: { ticketId: 't-1', subject: 'Broken lift', category: 'general' },
    });
    const ack = notification({
      type: 'support_ticket.acknowledged',
      title: 'Support ticket received',
      body: 'x',
      data: { ticketId: 't-1', subject: 'Broken lift', category: 'general' },
    });

    expect(getNotificationContent(created, EN).body).toBe(
      '"Broken lift" was opened and needs a response.',
    );
    expect(getNotificationContent(ack, EN).title).toBe(
      'Support ticket received',
    );
    expect(getNotificationContent(created, AR).title).toBe('تذكرة دعم جديدة');
  });

  // Rows written before the render params existed must still read correctly.
  it('falls back to the stored English copy when render params are missing', () => {
    const legacy = notification({
      type: 'maintenance_request.created',
      title: 'Legacy title',
      body: 'Legacy body',
      data: { requestId: 'mr-1' }, // no requestTitle/renterName/unitNumber
    });

    expect(getNotificationContent(legacy, EN)).toEqual({
      title: 'Legacy title',
      body: 'Legacy body',
    });
  });

  it('falls back for a type the UI does not know', () => {
    const unknown = notification({
      type: 'billing.invoice_paid',
      title: 'Invoice paid',
      body: 'Payment received',
      data: {},
    });

    expect(getNotificationContent(unknown, EN)).toEqual({
      title: 'Invoice paid',
      body: 'Payment received',
    });
  });

  it('falls back when the dictionary has no types namespace', () => {
    const n = notification({
      data: {
        requestId: 'mr-1',
        requestTitle: 'No hot water',
        renterName: 'Jane Doe',
        unitNumber: '4B',
      },
    });
    const partial = { notifications: {} } as unknown as Dictionary;

    expect(getNotificationContent(n, partial)).toEqual({
      title: 'New maintenance request',
      body: 'Jane Doe (unit 4B) reported: "No hot water".',
    });
  });
});
