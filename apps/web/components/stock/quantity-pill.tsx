import { quantityLevel } from '@/lib/stock';

// A stock quantity rendered as a colour-coded pill so severity reads at a
// glance — colours only: red = low (< 15), yellow = medium (15–29), green =
// healthy (>= 30). Shared by the stock list and the per-medicine batch table so
// both colour quantities the same way.
const QUANTITY_PILL: Record<ReturnType<typeof quantityLevel>, string> = {
  low: 'bg-error/10 text-error',
  medium: 'bg-warning/15 text-warning-dark',
  ok: 'bg-success/10 text-success-dark',
};

export function QuantityPill({ quantity }: { quantity: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold ${QUANTITY_PILL[quantityLevel(quantity)]}`}
    >
      {quantity}
    </span>
  );
}
