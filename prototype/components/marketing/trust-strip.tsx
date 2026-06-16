export function TrustStrip() {
  const segments = [
    "Bike shops",
    "Salons",
    "Cafés",
    "Studios",
    "Boutiques",
    "Repair shops",
  ];

  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Built for the businesses behind your high street
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {segments.map((s) => (
            <span
              key={s}
              className="text-sm font-semibold tracking-tight text-foreground/70"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
