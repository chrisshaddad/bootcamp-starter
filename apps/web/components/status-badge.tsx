import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  /** The raw status value (e.g. an enum member). */
  status: string;
  /** Optional map from status → human label. Falls back to the raw status. */
  labels?: Record<string, string>;
  /** Optional map from status → Tailwind color classes. */
  colors?: Record<string, string>;
  /** Extra classes — e.g. to enlarge or add a border for a detail view. */
  className?: string;
}

const FALLBACK_COLOR = 'bg-muted text-muted-foreground';

/**
 * Small pill for showing a status. Callers supply per-resource `labels` and
 * `colors` maps (use the semantic alert / library tokens, e.g.
 * `bg-success-light text-success-dark`). Sizing/border can be overridden via
 * `className` (tailwind-merge wins over the defaults).
 */
export function StatusBadge({
  status,
  labels,
  colors,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors?.[status] ?? FALLBACK_COLOR,
        className,
      )}
    >
      {labels?.[status] ?? status}
    </span>
  );
}
