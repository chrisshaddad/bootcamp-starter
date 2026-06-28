/**
 * Shared capacity bar used by both PricingSection and BillingShell.
 * Renders MAX_BUILDINGS_DISPLAY segments filled in gold, with an ∞ glyph for unlimited plans.
 */

export const MAX_BUILDINGS_DISPLAY = 5;

type BuildingBarProps = {
  count: number | null;
  /** Optional aria-label for the meter element */
  ariaLabel?: string;
};

export function BuildingBar({ count, ariaLabel }: BuildingBarProps) {
  const filled = count ?? MAX_BUILDINGS_DISPLAY;
  const total = MAX_BUILDINGS_DISPLAY;
  return (
    <div
      className="flex gap-1"
      role="meter"
      aria-valuemin={0}
      aria-valuenow={count ?? total}
      aria-valuemax={total}
      aria-label={ariaLabel}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{
            background: i < filled ? '#C9A35B' : 'rgba(255,255,255,0.10)',
          }}
        />
      ))}
      {count === null && (
        <span
          aria-hidden="true"
          className="ms-1 text-xs font-bold leading-none"
          style={{ color: '#C9A35B' }}
        >
          ∞
        </span>
      )}
    </div>
  );
}
