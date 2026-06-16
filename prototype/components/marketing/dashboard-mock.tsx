import { ArrowUpRight, TrendingUp, Trophy } from "lucide-react";

type Kpi = {
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
};

const KPIS: Kpi[] = [
  { label: "Revenue", value: "$61,880", delta: "+12.4%", positive: true },
  { label: "Gross margin", value: "41.2%", delta: "+3.1pt", positive: true },
  { label: "Net margin", value: "7.8%", delta: "+1.6pt", positive: true },
];

type Bar = { label: string; value: number; tone: "primary" | "accent" };

// Monthly revenue heights as percentages for a pure-CSS bar chart.
const BARS: Bar[] = [
  { label: "Jan", value: 52, tone: "primary" },
  { label: "Feb", value: 61, tone: "primary" },
  { label: "Mar", value: 48, tone: "primary" },
  { label: "Apr", value: 73, tone: "primary" },
  { label: "May", value: 66, tone: "accent" },
  { label: "Jun", value: 88, tone: "accent" },
];

export function DashboardMock() {
  return (
    <div
      aria-hidden
      className="w-full rounded-2xl border border-border bg-card/80 p-4 shadow-2xl shadow-primary-base/10 backdrop-blur sm:p-5"
    >
      {/* window chrome */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Profitability overview
          </span>
        </div>
        <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-[0.7rem] font-medium text-muted-foreground">
          Last 6 months
        </span>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-background/50 p-3 sm:p-3.5"
          >
            <p className="text-[0.7rem] font-medium text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-1 text-base font-bold tracking-tight text-foreground sm:text-xl">
              {kpi.value}
            </p>
            <p
              className={
                kpi.positive
                  ? "mt-1 flex items-center gap-0.5 text-[0.7rem] font-medium text-success"
                  : "mt-1 flex items-center gap-0.5 text-[0.7rem] font-medium text-error"
              }
            >
              <TrendingUp className="size-3" />
              {kpi.delta}
            </p>
          </div>
        ))}
      </div>

      {/* CSS bar chart */}
      <div className="mt-3 rounded-xl border border-border bg-background/50 p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">
            Revenue by month
          </p>
          <span className="flex items-center gap-1 text-[0.7rem] font-medium text-accent-base">
            <ArrowUpRight className="size-3" />
            Trending up
          </span>
        </div>
        <div className="flex h-28 items-end justify-between gap-2 sm:gap-3">
          {BARS.map((bar) => (
            <div
              key={bar.label}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div
                className={
                  bar.tone === "accent"
                    ? "w-full rounded-md bg-gradient-to-t from-accent-base/70 to-accent-base"
                    : "w-full rounded-md bg-gradient-to-t from-primary-base/40 to-primary-base"
                }
                style={{ height: `${bar.value}%` }}
              />
              <span className="text-[0.65rem] font-medium text-muted-foreground">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top performer row */}
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary-base/30 bg-primary-soft p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-base/20 text-primary-300">
          <Trophy className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-medium text-muted-foreground">
            Top performer
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            Road Bike — Carbon
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tracking-tight text-foreground">
            $1,240
          </p>
          <p className="text-[0.7rem] font-medium text-success">
            54% contribution
          </p>
        </div>
      </div>
    </div>
  );
}
