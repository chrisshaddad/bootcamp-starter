'use client';

import { useMemo, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';

export interface TrendPoint {
  label: string;
  value: number;
}

interface ApplicationsTrendChartProps {
  data: TrendPoint[];
}

const WIDTH = 560;
const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 28, left: 28 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

// Round the axis max up to a clean step (dataviz skill: "Y-axis ticks: round
// to clean numbers").
function niceMax(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Single-series area/line trend chart (sequential job, one hue - see
 * dataviz skill's choosing-a-form.md). Ships a crosshair + tooltip on hover
 * per the skill's interaction rules; every value is also visible via the
 * y-axis ticks, so the tooltip only enhances, never gates.
 */
export function ApplicationsTrendChart({ data }: ApplicationsTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = useMemo(
    () => niceMax(Math.max(1, ...data.map((d) => d.value))),
    [data],
  );

  const points = useMemo(
    () =>
      data.map((d, i) => {
        const x =
          data.length === 1
            ? PADDING.left + PLOT_WIDTH / 2
            : PADDING.left + (i / (data.length - 1)) * PLOT_WIDTH;
        const y =
          PADDING.top + PLOT_HEIGHT - (d.value / maxValue) * PLOT_HEIGHT;
        return { ...d, x, y };
      }),
    [data, maxValue],
  );

  const baselineY = PADDING.top + PLOT_HEIGHT;
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  const firstX = points[0]?.x ?? PADDING.left;
  const lastX = points[points.length - 1]?.x ?? PADDING.left;
  const areaPath = `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

  const yTicks = [0, maxValue / 2, maxValue];

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Applications submitted per week, last ${data.length} weeks`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + PLOT_HEIGHT - (tick / maxValue) * PLOT_HEIGHT;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} className="fill-primary/10" />
        <path
          d={linePath}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PADDING.top}
            y2={baselineY}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
          />
        )}

        {points.map((p, i) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r={4}
            className={cn(
              'stroke-card',
              hoverIndex === i ? 'fill-violet' : 'fill-primary',
            )}
            strokeWidth={2}
          />
        ))}

        {points.map((p, i) => (
          <text
            key={p.label}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            className={cn(
              'fill-muted-foreground text-[10px]',
              hoverIndex === i && 'fill-foreground font-medium',
            )}
          >
            {p.label}
          </text>
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-1.5 shadow-md"
          style={{ left: `${(hovered.x / WIDTH) * 100}%` }}
        >
          <p className="text-xs font-semibold text-foreground">
            {hovered.value}{' '}
            {hovered.value === 1 ? 'application' : 'applications'}
          </p>
          <p className="text-[11px] text-muted-foreground">{hovered.label}</p>
        </div>
      )}

      <table className="sr-only">
        <caption>Applications submitted per week</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Applications</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
