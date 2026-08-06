'use client';

import type { ElementType } from 'react';
import { Activity, Globe2 } from 'lucide-react';
import type {
  AnalyticsDailyPoint,
  AnalyticsRange,
  AnalyticsReferrer,
} from '@repo/contracts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AnalyticsRangeSelect({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7D">Last 7 days</SelectItem>
        <SelectItem value="30D">Last 30 days</SelectItem>
        <SelectItem value="90D">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function AnalyticsMetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ElementType;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card className="relative gap-4 overflow-hidden p-5 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary-base" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-base">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        {detail}
      </p>
    </Card>
  );
}

export function AnalyticsDailyChart({ data }: { data: AnalyticsDailyPoint[] }) {
  const maximum = Math.max(...data.map((point) => point.totalViews), 1);
  const dateLabels = data.length
    ? [data[0], data[Math.floor((data.length - 1) / 2)], data.at(-1)]
    : [];

  return (
    <Card className="gap-5 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-base">
          <Activity className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Views over time</h2>
          <p className="text-xs text-muted-foreground">
            Daily portfolio activity
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-muted/20 px-4 pt-5 pb-3">
        <div className="min-w-[560px]">
          <div className="relative h-40 border-b">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2].map((line) => (
                <div key={line} className="border-t border-border/60" />
              ))}
            </div>
            <div className="absolute inset-0 flex items-end gap-1.5">
              {data.map((point) => (
                <div
                  key={point.date}
                  className="group relative flex h-full min-w-1 flex-1 items-end"
                  title={`${point.date}: ${point.totalViews} views, ${point.uniqueVisitors} unique`}
                >
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                    {point.totalViews}
                  </span>
                  <div
                    className="w-full min-w-1 rounded-t bg-gradient-to-t from-primary-base to-chart-4 transition-opacity group-hover:opacity-75"
                    style={{
                      height: `${Math.max((point.totalViews / maximum) * 136, point.totalViews ? 6 : 2)}px`,
                      opacity: point.totalViews ? 1 : 0.18,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 text-[10px] text-muted-foreground">
            {dateLabels.map((point, index) => (
              <span
                key={`${point?.date}-${index}`}
                className={
                  index === 1 ? 'text-center' : index === 2 ? 'text-right' : ''
                }
              >
                {point ? formatShortDate(point.date) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function AnalyticsReferrers({
  referrers,
}: {
  referrers: AnalyticsReferrer[];
}) {
  const maximum = Math.max(...referrers.map((item) => item.views), 1);
  return (
    <Card className="gap-5 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-base">
          <Globe2 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Top traffic sources</h2>
          <p className="text-xs text-muted-foreground">
            Where your visitors come from
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {referrers.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Traffic sources will appear after your first visits.
          </div>
        ) : (
          referrers.map((item) => (
            <div
              key={item.source}
              className="space-y-2 rounded-xl bg-muted/30 p-3"
            >
              <div className="flex justify-between gap-4 text-sm">
                <span className="truncate">{item.source}</span>
                <span className="font-semibold tabular-nums">{item.views}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-chart-4"
                  style={{ width: `${(item.views / maximum) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}
