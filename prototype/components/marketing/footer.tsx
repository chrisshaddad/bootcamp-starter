import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS: { heading: string; links: string[] }[] = [
  {
    heading: "Product",
    links: ["Features", "How it works", "AI insights", "Pricing"],
  },
  {
    heading: "Company",
    links: ["About", "Customers", "Careers", "Contact"],
  },
  {
    heading: "Legal",
    links: ["Privacy", "Terms", "Security", "Status"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Profitability software for small businesses. Track, understand,
              and improve your margins.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="/login"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © 2026 Margin. Prototype.
          </p>
          <p className="text-xs text-muted-foreground">
            Made for small businesses that want to keep more of what they earn.
          </p>
        </div>
      </div>
    </footer>
  );
}
