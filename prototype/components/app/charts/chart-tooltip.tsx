import { formatCurrency } from "@/lib/format";

interface TipItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: { color?: string };
}

/** Shared recharts tooltip that formats values as currency. */
export function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      {label !== undefined && label !== "" && (
        <p className="mb-1.5 font-medium text-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ background: p.color ?? p.payload?.color ?? "var(--primary)" }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {formatCurrency(Number(p.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
