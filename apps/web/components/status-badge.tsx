const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning-light text-warning-dark',
  ACTIVE: 'bg-success-light text-success-dark',
  REJECTED: 'bg-error-light text-error-dark',
  SUSPENDED: 'bg-secondary text-secondary-foreground',
  INACTIVE: 'bg-muted text-muted-foreground',
};

interface StatusBadgeProps {
  status: string;
  /** Override the default label (e.g. "Pending Approval" on detail views). */
  label?: string;
}

/**
 * Shared status pill used across institutions, users, and patients.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_COLORS[status] || 'bg-muted text-muted-foreground'
      }`}
    >
      {label || STATUS_LABELS[status] || status}
    </span>
  );
}
