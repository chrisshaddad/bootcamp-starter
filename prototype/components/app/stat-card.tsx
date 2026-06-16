import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendChip } from "./trend-chip";

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  trend?: { value: number; goodWhenUp?: boolean };
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary-base/40",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {trend && (
          <TrendChip
            value={trend.value}
            goodWhenUp={trend.goodWhenUp}
            className="mb-1.5"
          />
        )}
      </div>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
