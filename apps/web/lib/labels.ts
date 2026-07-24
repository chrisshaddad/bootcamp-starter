import type { badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import type { ApplicationStatus, OpportunityStatus } from '@repo/contracts';

type Tone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

/** Turn an ENUM_VALUE into a human "Enum Value" label. */
export function toLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Badge tone for an opportunity status — single source of truth. */
export const OPPORTUNITY_STATUS_TONE: Record<OpportunityStatus, Tone> = {
  OPEN: 'success',
  CLOSED: 'neutral',
  FILLED: 'info',
};

/** Badge tone for an application status — single source of truth. */
export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, Tone> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

/**
 * Badge tone for an organization status. Keyed loosely by string since the
 * status set (PENDING/ACTIVE/REJECTED/SUSPENDED/INACTIVE) spans a couple of
 * contract types; callers fall back to 'neutral' for anything unmapped.
 */
export const ORGANIZATION_STATUS_TONE: Record<string, Tone> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'warning',
  INACTIVE: 'neutral',
};
