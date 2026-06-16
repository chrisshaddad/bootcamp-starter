import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A small up/down delta chip. `value` is a fraction (0.123 = 12.3%). */
export function TrendChip({
  value,
  goodWhenUp = true,
  className,
}: {
  value: number;
  goodWhenUp?: boolean;
  className?: string;
}) {
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
        good ? "bg-success/12 text-success" : "bg-error/12 text-error",
        className,
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value * 100).toFixed(1)}%
    </span>
  );
}
