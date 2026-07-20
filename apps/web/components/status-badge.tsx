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
  SUSPENDED: 'bg-secondary-200 text-secondary-base',
  INACTIVE: 'bg-muted text-muted-foreground',
};

interface StatusBadgeProps {
  status: string;
  /** Override the default label (e.g. "Pending Approval" on detail views). */
  label?: string;
  /** When set, the badge becomes a button (e.g. to open a confirm dialog). */
  onClick?: () => void;
}

/**
 * Shared status pill used across institutions, users, and patients.
 */
export function StatusBadge({ status, label, onClick }: StatusBadgeProps) {
  const className = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
    STATUS_COLORS[status] || 'bg-muted text-muted-foreground'
  } ${onClick ? 'cursor-pointer transition-opacity hover:opacity-75' : ''}`;
  const content = label || STATUS_LABELS[status] || status;

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}
