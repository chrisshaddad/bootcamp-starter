import { cn } from '@/lib/utils';

interface BarDatum {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarDatum[];
  /** Accessible name for the chart, e.g. "Records added this week by type". */
  title: string;
  className?: string;
}

const TRACK_HEIGHT = 140; // px — the bars' plotting height, excludes labels

/** A single-series bar chart — one hue, direct value labels, no legend needed. */
export function SimpleBarChart({
  data,
  title,
  className,
}: SimpleBarChartProps) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  if (data.every((d) => d.value === 0)) {
    return (
      <div
        className={cn(
          'flex h-40 items-center justify-center text-sm text-muted-foreground',
          className,
        )}
      >
        No records in this period.
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-end gap-3', className)}
      role="img"
      aria-label={title}
    >
      {data.map((d) => {
        const heightPct =
          d.value === 0 ? 0 : Math.max(6, (d.value / maxValue) * 100);

        return (
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center gap-1.5"
            title={`${d.label}: ${d.value}`}
            tabIndex={0}
          >
            <span className="text-xs font-medium text-foreground">
              {d.value}
            </span>
            <div
              className="flex w-full items-end justify-center"
              style={{ height: TRACK_HEIGHT }}
            >
              <div
                className="w-full max-w-8 rounded-t-[4px] bg-primary-base transition-opacity hover:opacity-80"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-center text-xs leading-tight text-muted-foreground">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
