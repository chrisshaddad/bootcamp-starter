import type { badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import type {
  ApplicationStatus,
  OpportunityStatus,
  OpportunityType,
} from '@repo/contracts';

export type Tone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

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

/**
 * Badge/accent tone for an opportunity type - gives each category (Role,
 * Project, Rotation) its own color so opportunity/opening cards read as
 * distinct at a glance, rather than a single uniform accent.
 */
export const OPPORTUNITY_TYPE_TONE: Record<OpportunityType, Tone> = {
  ROLE: 'violet',
  PROJECT: 'warning',
  ROTATION: 'blush',
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

// Rotation used by `categoryTone` - deliberately skips 'neutral'/'danger' so
// free-form categories read as lively/varied rather than washed-out or
// alarming.
const CATEGORY_TONE_ROTATION: Tone[] = [
  'violet',
  'warning',
  'blush',
  'info',
  'primary',
  'success',
];

/**
 * Deterministically assigns one of a rotating set of tones to a free-form
 * category string (e.g. a skill's category) so tag/chip UIs get color
 * variety without needing an explicit enum → tone mapping.
 */
export function categoryTone(category: string): Tone {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) | 0;
  }
  return CATEGORY_TONE_ROTATION[
    Math.abs(hash) % CATEGORY_TONE_ROTATION.length
  ]!;
}

/** Solid icon-chip background+text classes per tone - pairs with Badge's
 * softer pill treatment for icon avatars (e.g. section card headers). */
export const TONE_CHIP_CLASSES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success-strong',
  warning: 'bg-warning/18 text-warning-strong',
  danger: 'bg-destructive/12 text-destructive-strong',
  info: 'bg-info/15 text-info',
  violet: 'bg-violet/15 text-violet',
  blush: 'bg-blush/15 text-blush-strong',
};

/** Left-border accent classes per tone (literal strings for Tailwind's
 * scanner) - used for tag/chip lists like skill pills. */
export const TONE_BORDER_CLASSES: Record<Tone, string> = {
  neutral: 'border-l-border',
  primary: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-destructive',
  info: 'border-l-info',
  violet: 'border-l-violet',
  blush: 'border-l-blush',
};
