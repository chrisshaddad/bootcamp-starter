import Link from "next/link";
import { ArrowRight, Info, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AiTeaser() {
  return (
    <section id="ai" className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
        {/* copy */}
        <div>
          <Badge
            variant="outline"
            className="gap-1.5 border-accent-base/30 bg-card text-accent-base"
          >
            <Sparkles className="size-3" />
            AI insights
          </Badge>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Advice that actually knows your business
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Margin&apos;s AI reads the same metrics on your dashboard, so its
            recommendations are specific to your costs, your prices, and your
            product mix. Every insight comes with the action to take — and an
            honest caveat about what to check first.
          </p>
          <div className="mt-8">
            <Button render={<Link href="/login" />} size="lg" className="group">
              Try it on your numbers
              <ArrowRight className="transition-transform group-hover/button:translate-x-0.5" />
            </Button>
          </div>
        </div>

        {/* faux AI insight card */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 rounded-[1.75rem] bg-gradient-to-br from-accent-base/15 to-primary-base/15 blur-2xl"
          />
          <div className="rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-primary-base/10 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-base to-accent-base text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Margin AI
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  Based on your last 90 days
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-foreground">
              <span className="font-semibold">Parts &amp; Supplies</span> is your
              biggest cost lever — it&apos;s{" "}
              <span className="font-semibold text-primary-300">38%</span> of total
              expenses and rising faster than revenue. Your tune-up service has
              the strongest contribution margin at{" "}
              <span className="font-semibold text-accent-base">61%</span>.
            </p>

            <div className="mt-4 rounded-xl border border-primary-base/30 bg-primary-soft p-3.5">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-primary-300">
                <Lightbulb className="size-3.5" />
                Suggested action
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                Renegotiate your top two parts suppliers and promote tune-ups in
                June. Trimming parts cost by 5% would lift net margin to roughly{" "}
                <span className="font-semibold">9.4%</span>.
              </p>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Caveat: this assumes your current sales volume holds. Confirm
              supplier terms before committing to new pricing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
