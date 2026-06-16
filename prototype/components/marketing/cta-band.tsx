import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const POINTS = ["Free to start", "No card required", "Set up in minutes"];

export function CtaBand() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-24">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-primary-base/30 bg-gradient-to-br from-primary-base/20 to-accent-base/10 px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(30rem_16rem_at_50%_0%,rgba(124,77,255,0.25),transparent_70%)]"
        />
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Stop guessing at your profit.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Join the small businesses turning their numbers into clear, confident
          decisions with Margin.
        </p>

        <div className="mt-8 flex justify-center">
          <Button render={<Link href="/login" />} size="lg" className="group">
            Get started free
            <ArrowRight className="transition-transform group-hover/button:translate-x-0.5" />
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {POINTS.map((p) => (
            <li
              key={p}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
            >
              <Check className="size-4 text-success" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
