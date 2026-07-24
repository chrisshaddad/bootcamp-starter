import { toLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@repo/contracts';

// Status colors are fixed/reserved, never the categorical theme - see
// dataviz skill's color-formula.md. Identity is never carried by hue alone:
// each segment is paired with a legend dot + label + count below the bar.
const STATUS_ORDER: ApplicationStatus[] = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
];

const STATUS_FILL: Record<ApplicationStatus, string> = {
  PENDING: 'bg-warning',
  ACCEPTED: 'bg-success',
  REJECTED: 'bg-destructive',
  WITHDRAWN: 'bg-muted-foreground/35',
};

interface StatusBreakdownBarProps {
  counts: Record<ApplicationStatus, number>;
}

export function StatusBreakdownBar({ counts }: StatusBreakdownBarProps) {
  const total = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">No applications yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="img"
        aria-label={`Applications by status: ${STATUS_ORDER.map((s) => `${toLabel(s)} ${counts[s]}`).join(', ')}`}
        className="flex h-6 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
          <div
            key={status}
            className={STATUS_FILL[status]}
            style={{ width: `${(counts[status] / total) * 100}%` }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                STATUS_FILL[status],
              )}
              aria-hidden
            />
            <span className="text-muted-foreground">{toLabel(status)}</span>
            <span className="font-semibold text-foreground">
              {counts[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
