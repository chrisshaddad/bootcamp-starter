import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
};

// All keyed off Design-4 palette tokens — no raw Tailwind colors.
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-success/12 text-success border-success/30',
  PENDING: 'bg-amber-soft text-amber-strong border-amber/40',
  REJECTED: 'bg-error-light text-danger border-danger/30',
  SUSPENDED: 'bg-error-light text-danger border-danger/25',
  INACTIVE: 'bg-sunken text-text-2 border-border-strong',
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  PENDING: 'bg-amber',
  REJECTED: 'bg-danger',
  SUSPENDED: 'bg-danger',
  INACTIVE: 'bg-text-3',
};

export function StatusBadge({
  status,
  label,
  size = 'sm',
}: {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-bold',
        size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10.5px]',
        STATUS_STYLE[status] ?? STATUS_STYLE.INACTIVE,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          STATUS_DOT[status] ?? 'bg-text-3',
        )}
      />
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}
