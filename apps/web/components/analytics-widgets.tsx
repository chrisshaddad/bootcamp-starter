'use client';

import type { ElementType } from 'react';
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
    <Card className="gap-3 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-base">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

export function AnalyticsDailyChart({ data }: { data: AnalyticsDailyPoint[] }) {
  const maximum = Math.max(...data.map((point) => point.totalViews), 1);

  return (
    <Card className="p-5 shadow-sm">
      <div>
        <h2 className="font-semibold">Views over time</h2>
        <p className="text-xs text-muted-foreground">
          Total views per calendar day
        </p>
      </div>
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="flex h-48 min-w-[560px] items-end gap-1.5">
          {data.map((point) => (
            <div
              key={point.date}
              className="group flex min-w-1 flex-1 flex-col items-center justify-end gap-2"
              title={`${point.date}: ${point.totalViews} views, ${point.uniqueVisitors} unique`}
            >
              <span className="text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                {point.totalViews}
              </span>
              <div
                className="w-full min-w-1 rounded-t bg-primary-base transition-opacity group-hover:opacity-75"
                style={{
                  height: `${Math.max((point.totalViews / maximum) * 140, point.totalViews ? 4 : 1)}px`,
                  opacity: point.totalViews ? 1 : 0.15,
                }}
              />
              {(data.length <= 7 || point.date.endsWith('-01')) && (
                <span className="whitespace-nowrap text-[9px] text-muted-foreground">
                  {formatShortDate(point.date)}
                </span>
              )}
            </div>
          ))}
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
    <Card className="p-5 shadow-sm">
      <h2 className="font-semibold">Top traffic sources</h2>
      <p className="text-xs text-muted-foreground">
        Referrer domains only; no visitor identity is stored
      </p>
      <div className="mt-5 space-y-4">
        {referrers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No traffic yet.</p>
        ) : (
          referrers.map((item) => (
            <div key={item.source} className="space-y-1.5">
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
