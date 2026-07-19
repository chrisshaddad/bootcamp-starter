'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TrendDatum {
  date: string; // YYYY-MM-DD
  value: number;
}

interface TrendLineChartProps {
  data: TrendDatum[];
  title: string;
  className?: string;
}

const DEFAULT_WIDTH = 600;
const HEIGHT = 160;
const PADDING = 12;

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${month}/${day}`;
}

/**
 * A single-series trend line — one hue, crosshair + tooltip on hover/focus.
 * The viewBox width is measured from the container (rather than fixed) so
 * the SVG's coordinate space always matches its rendered pixel size 1:1 —
 * otherwise `preserveAspectRatio`'s default letterboxing leaves dead space
 * on wide containers and throws off the pointer-to-point hit testing.
 */
export function TrendLineChart({ data, title, className }: TrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) setWidth(measured);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const innerWidth = width - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;

  const points = useMemo(
    () =>
      data.map((d, i) => {
        const x =
          PADDING + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerWidth);
        const y = PADDING + innerHeight - (d.value / maxValue) * innerHeight;
        return { x, y, ...d };
      }),
    [data, innerWidth, innerHeight, maxValue],
  );

  const lastPoint = points[points.length - 1];
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L ${lastPoint?.x ?? 0},${PADDING + innerHeight} L ${points[0]?.x ?? 0},${PADDING + innerHeight} Z`;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    // 1 viewBox unit === 1 CSS pixel here, since viewBox width tracks the
    // measured container width, so no ratio conversion is needed.
    const relativeX = e.clientX - rect.left;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  };

  const active = activeIndex !== null ? points[activeIndex] : null;

  if (data.every((d) => d.value === 0)) {
    return (
      <div
        className={cn(
          'flex h-40 items-center justify-center text-sm text-muted-foreground',
          className,
        )}
      >
        No new patients in this period.
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={title}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {/* Baseline */}
        <line
          x1={PADDING}
          y1={PADDING + innerHeight}
          x2={width - PADDING}
          y2={PADDING + innerHeight}
          className="stroke-border"
          strokeWidth={1}
        />

        <path d={areaPath} className="fill-primary-base opacity-10" />
        <path
          d={linePath}
          className="stroke-primary-base"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />

        {/* End marker on the most recent point */}
        {lastPoint && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={4}
            className="fill-primary-base stroke-card"
            strokeWidth={2}
          />
        )}

        {/* Crosshair */}
        {active && (
          <>
            <line
              x1={active.x}
              y1={PADDING}
              x2={active.x}
              y2={PADDING + innerHeight}
              className="stroke-border"
              strokeWidth={1}
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4}
              className="fill-primary-base stroke-card"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: `${(active.x / width) * 100}%` }}
        >
          <span className="font-semibold text-foreground">{active.value}</span>{' '}
          <span className="text-muted-foreground">
            on {formatShortDate(active.date)}
          </span>
        </div>
      )}
    </div>
  );
}
