import type { LucideIcon } from "lucide-react";
import { BarChart3, Receipt, Sparkles, Users } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: Receipt,
    title: "Track sales & expenses",
    description:
      "Log every product, service, and cost in one place — bikes and parts, tune-ups and repairs, rent and supplies.",
  },
  {
    icon: BarChart3,
    title: "Real profitability metrics",
    description:
      "Revenue, gross & net margin, per-item contribution margin, expense breakdown, and break-even — all computed in code, not guessed.",
  },
  {
    icon: Sparkles,
    title: "AI insights on your numbers",
    description:
      "Ask what's eating your margin and what to do next. Answers are grounded in your real figures, never generic advice.",
  },
  {
    icon: Users,
    title: "Multi-tenant with roles",
    description:
      "Each business gets its own workspace. Invite your team as Admins or Members with the right level of access.",
  },
];

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-primary-base/40">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-300">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-accent-base">
            Everything in one place
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From raw transactions to real profit decisions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Most tools tell you what you earned. Margin tells you what you kept,
            where it went, and what to change.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
