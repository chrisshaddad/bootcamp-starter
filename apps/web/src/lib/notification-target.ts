import type { NotificationResponse } from '@/types/api';

/**
 * Which chrome the notification is being rendered in. The same notification
 * deep-links to different places depending on who is reading it: an admin goes
 * to the request in the Tasks register, a tenant goes to their own portal list
 * (they have no access to `/dashboard/*` at all).
 */
export type NotificationSurface = 'dashboard' | 'portal';

function readId(
  data: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = data?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Resolve the page a notification came from, or `null` when it has no known
 * destination (in which case the row is still readable, just not clickable).
 *
 * Destinations are driven by the `data` payload the API attaches when it
 * enqueues — `requestId` for maintenance requests, `ticketId` for support
 * tickets — and fall back to the `type` prefix so older rows written before
 * those payloads existed still route somewhere sensible.
 */
export function getNotificationHref(
  notification: NotificationResponse,
  locale: string,
  surface: NotificationSurface,
): string | null {
  const data = notification.data as Record<string, unknown> | null | undefined;
  const type = notification.type.toLowerCase();

  const ticketId = readId(data, 'ticketId');
  const invoiceId = readId(data, 'invoiceId');
  // A work-order notification points at the maintenance request that owns it —
  // there is no standalone work-order route, they are shown on the request.
  const requestId =
    readId(data, 'requestId') ?? readId(data, 'maintenanceRequestId');

  const isMaintenance =
    type.startsWith('maintenance_request') ||
    type.startsWith('work_order') ||
    !!requestId;
  const isTicket =
    type.startsWith('support_ticket') ||
    type.includes('ticket') ||
    type.includes('support') ||
    !!ticketId;
  const isInvoice = type.startsWith('invoice') || !!invoiceId;
  const isLease = type.startsWith('lease');

  if (surface === 'portal') {
    // A tenant's whole support world — their requests and their tickets — lives
    // on one portal page, so both kinds land there.
    if (isMaintenance || isTicket) return `/${locale}/portal/support`;
    // Portal home is where the tenant's lease lives.
    if (isLease) return `/${locale}/portal`;
    // Invoices have no tenant-facing page yet, so those stay unclickable rather
    // than dropping the tenant on a screen that cannot show them.
    return null;
  }

  if (isMaintenance) {
    return requestId
      ? `/${locale}/dashboard/tasks/${requestId}`
      : `/${locale}/dashboard/tasks`;
  }
  if (isTicket) return `/${locale}/dashboard/support`;
  if (isInvoice && invoiceId)
    return `/${locale}/dashboard/invoices/${invoiceId}`;
  if (isLease) return `/${locale}/dashboard/leases`;
  return null;
}
