import type { Dictionary } from '@/i18n/get-dictionary';
import type { NotificationResponse } from '@/types/api';

/**
 * Localized title + body for a notification.
 *
 * The API stores English `title`/`body` on the row (it has no locale context —
 * the same row also feeds the email step), plus the render params under `data`.
 * The UI is the right place to translate, so we rebuild the copy here from
 * `type` + `data` and fall back to the stored strings whenever the type is
 * unknown or a required param is missing. That keeps rows written before this
 * existed — and any future type the UI doesn't know yet — readable.
 */
export type NotificationContent = { title: string; body: string | null };

type Params = Record<string, unknown>;

function str(data: Params, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Replace `{name}` placeholders with the supplied values. */
function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

export function getNotificationContent(
  notification: NotificationResponse,
  dict: Dictionary,
): NotificationContent {
  const fallback: NotificationContent = {
    title: notification.title,
    body: notification.body ?? null,
  };

  // `notifications.types` and the status label maps are the only dict paths this
  // helper needs; treat them defensively so a partially-merged catalog degrades
  // to the English fallback rather than throwing.
  const types = (dict.notifications as unknown as Params | undefined)?.[
    'types'
  ] as Params | undefined;
  if (!types) return fallback;

  const data = (notification.data ?? {}) as Params;
  const type = notification.type;

  const requestStatuses = (dict.tasks as unknown as Params | undefined)?.[
    'status'
  ] as Record<string, string> | undefined;
  const ticketStatuses = (dict.support as unknown as Params | undefined)?.[
    'status'
  ] as Record<string, string> | undefined;

  const entry = (key: string): { title?: string; body?: string } | null =>
    (types[key] as { title?: string; body?: string } | undefined) ?? null;

  const build = (
    key: string,
    values: Record<string, string>,
  ): NotificationContent => {
    const copy = entry(key);
    if (!copy?.title) return fallback;
    return {
      title: interpolate(copy.title, values),
      body: copy.body ? interpolate(copy.body, values) : fallback.body,
    };
  };

  if (type === 'maintenance_request.created') {
    const requestTitle = str(data, 'requestTitle');
    const renterName = str(data, 'renterName');
    const unitNumber = str(data, 'unitNumber');
    if (!requestTitle || !renterName || !unitNumber) return fallback;
    return build('maintenanceRequestCreated', {
      requestTitle,
      renterName,
      unitNumber,
    });
  }

  if (type.startsWith('maintenance_request.')) {
    const requestTitle = str(data, 'requestTitle');
    const status = str(data, 'status') ?? type.slice('maintenance_request.'.length);
    if (!requestTitle || !status) return fallback;
    return build('maintenanceRequestStatus', {
      requestTitle,
      status: requestStatuses?.[status] ?? status,
    });
  }

  if (type === 'support_ticket.created' || type === 'support_ticket.acknowledged') {
    const subject = str(data, 'subject');
    if (!subject) return fallback;
    const category = str(data, 'category');
    return build(
      type === 'support_ticket.created'
        ? 'supportTicketCreated'
        : 'supportTicketAcknowledged',
      { subject, category: category ?? '' },
    );
  }

  if (type.startsWith('support_ticket.')) {
    const subject = str(data, 'subject');
    const status = str(data, 'status') ?? type.slice('support_ticket.'.length);
    if (!subject || !status) return fallback;
    return build('supportTicketStatus', {
      subject,
      status: ticketStatuses?.[status] ?? status,
    });
  }

  return fallback;
}
