import { BarChart3, MessageSquareText, PlusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: PlusCircle,
    title: "Add your items & expenses",
    description:
      "Enter the products and services you sell, their costs, and your recurring expenses. A few minutes is all it takes.",
  },
  {
    icon: BarChart3,
    title: "See your profitability dashboard",
    description:
      "Margins, contribution per item, expense breakdown, and break-even appear instantly — recalculated as your data changes.",
  },
  {
    icon: MessageSquareText,
    title: "Ask the AI what to do next",
    description:
      "Get specific, numbers-backed recommendations on pricing, costs, and product mix — then act with confidence.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-border bg-card/30">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-accent-base">How it works</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Profit clarity in three steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            No spreadsheets, no accounting degree. Set it up once and let Margin
            do the math.
          </p>
        </div>

        <div className="relative mt-14">
          {/* connecting line (desktop) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-primary-base/40 to-transparent lg:block"
          />

          <ol className="grid gap-10 lg:grid-cols-3 lg:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative flex flex-col">
                <div className="flex items-center gap-4">
                  <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary-base/30 bg-primary-soft text-primary-300">
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-sm font-bold tracking-widest text-muted-foreground">
                    STEP {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
