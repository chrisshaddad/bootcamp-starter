const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
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
        STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {label || STATUS_LABELS[status] || status}
    </span>
  );
}
