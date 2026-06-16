import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardMock } from "@/components/marketing/dashboard-mock";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* gradient glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-6rem] -z-10 mx-auto h-[40rem] max-w-5xl bg-[radial-gradient(40rem_22rem_at_50%_0%,rgba(124,77,255,0.22),transparent_70%)]"
      />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-16 pb-20 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24 lg:pb-28">
        {/* copy */}
        <div className="flex flex-col items-start">
          <Badge
            variant="outline"
            className="gap-1.5 border-primary-base/30 bg-primary-soft px-3 py-1 text-primary-300"
          >
            <Sparkles className="size-3" />
            AI-powered profitability
          </Badge>

          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Know your margins.{" "}
            <span className="bg-gradient-to-r from-primary-300 via-primary-base to-accent-base bg-clip-text text-transparent">
              Grow your profit.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Margin turns your sales and expenses into real profitability
            metrics — gross and net margin, per-item contribution, break-even —
            then layers on AI insights tied to your actual numbers, not generic
            advice.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button render={<Link href="/login" />} size="lg" className="group">
              Get started
              <ArrowRight className="transition-transform group-hover/button:translate-x-0.5" />
            </Button>
            <Button
              render={<Link href="#how" />}
              variant="outline"
              size="lg"
            >
              See how it works
            </Button>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {[
              { v: "Built in code", l: "Every metric computed, not estimated" },
              { v: "Multi-tenant", l: "Admin & Member roles" },
              { v: "AI-grounded", l: "Tied to your real numbers" },
            ].map((item) => (
              <div key={item.v} className="flex flex-col">
                <dt className="text-sm font-semibold text-foreground">
                  {item.v}
                </dt>
                <dd className="text-xs text-muted-foreground">{item.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* product preview */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary-base/20 to-accent-base/10 blur-2xl"
          />
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}
