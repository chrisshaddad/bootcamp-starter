import type { InquiryStatus } from '@repo/contracts';

// Display metadata for each inquiry status, so every surface (badge, queue tab,
// row accent) uses one consistent colour per status:
//   badge     — the pill on a row / the thread header
//   dot       — solid swatch shown on the filter tab
//   activeTab — filled styling when that status tab is selected
//   rowAccent — left-border colour tinting each queue row by its status
// Ordered as the lifecycle flows, which is also the tab order.
export const INQUIRY_STATUS_META: Record<
  InquiryStatus,
  {
    label: string;
    badge: string;
    dot: string;
    activeTab: string;
    rowAccent: string;
  }
> = {
  PENDING: {
    label: 'Pending',
    badge: 'bg-warning/10 text-warning-dark',
    dot: 'bg-warning',
    activeTab: 'border-warning bg-warning/10 text-warning-dark',
    rowAccent: 'border-l-warning',
  },
  IN_PROGRESS: {
    label: 'In progress',
    badge: 'bg-primary-100 text-primary-hover',
    dot: 'bg-primary',
    activeTab: 'border-primary-hover bg-primary-100 text-primary-hover',
    rowAccent: 'border-l-primary',
  },
  ANSWERED: {
    label: 'Answered',
    badge: 'bg-success/10 text-success',
    dot: 'bg-success',
    activeTab: 'border-success bg-success/10 text-success',
    rowAccent: 'border-l-success',
  },
  CLOSED: {
    label: 'Closed',
    badge: 'bg-gray-200 text-gray-500',
    dot: 'bg-gray-400',
    activeTab: 'border-gray-400 bg-gray-100 text-gray-600',
    rowAccent: 'border-l-gray-300',
  },
};

// Status order for tabs and the status selector.
export const INQUIRY_STATUSES: InquiryStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'ANSWERED',
  'CLOSED',
];

// "12 Aug 2026, 14:30" — the timestamp shown on messages and the thread header.
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// A compact relative-ish label for the queue's "last updated" column. Falls back
// to an absolute date once the activity is more than a week old.
export function formatRelative(value: string | Date): string {
  const then = new Date(value).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
