// Shared status → label / color maps for the circulation & membership badges.
// Colors use the semantic alert + library palette tokens (see globals.css).

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
};

export const MEMBER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success-light text-success-dark',
  EXPIRED: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-library-accent-100 text-library-accent-800',
  PENDING: 'bg-warning-light text-warning-dark',
  CANCELLED: 'bg-error-light text-error',
};

export const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  ADULT: 'Adult',
  PREMIUM: 'Premium',
};

export const RENTAL_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  RETURNED: 'Returned',
  OVERDUE: 'Overdue',
  LOST: 'Lost',
};

export const RENTAL_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-library-accent-100 text-library-accent-800',
  RETURNED: 'bg-success-light text-success-dark',
  OVERDUE: 'bg-error-light text-error',
  LOST: 'bg-muted text-muted-foreground',
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  READY_FOR_PICKUP: 'Ready for pickup',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-library-accent-100 text-library-accent-800',
  READY_FOR_PICKUP: 'bg-warning-light text-warning-dark',
  FULFILLED: 'bg-success-light text-success-dark',
  EXPIRED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-error-light text-error',
};
