import { toLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { OpportunityType } from '@repo/contracts';

// 3 series - within the "1-3: color alone is comfortable, direct-label"
// tier (dataviz skill's series-count ladder), so each bar is direct-labeled
// and no separate legend box is needed.
const TYPE_ORDER: OpportunityType[] = ['ROLE', 'PROJECT', 'ROTATION'];

const TYPE_FILL: Record<OpportunityType, string> = {
  ROLE: 'bg-chart-cat-1',
  PROJECT: 'bg-chart-cat-2',
  ROTATION: 'bg-chart-cat-3',
};

interface OpportunityTypeBarsProps {
  counts: Record<OpportunityType, number>;
}

export function OpportunityTypeBars({ counts }: OpportunityTypeBarsProps) {
  const total = TYPE_ORDER.reduce((sum, type) => sum + counts[type], 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No open opportunities right now.
      </p>
    );
  }

  const max = Math.max(...TYPE_ORDER.map((type) => counts[type]));

  return (
    <div className="space-y-3">
      {TYPE_ORDER.map((type) => (
        <div key={type} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-sm text-muted-foreground">
            {toLabel(type)}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
            {counts[type] > 0 && (
              <div
                role="img"
                aria-label={`${toLabel(type)}: ${counts[type]} open`}
                className={cn('h-full rounded-full', TYPE_FILL[type])}
                style={{ width: `${(counts[type] / max) * 100}%` }}
              />
            )}
          </div>
          <span className="w-5 shrink-0 text-right text-sm font-semibold text-foreground">
            {counts[type]}
          </span>
        </div>
      ))}
    </div>
  );
}
