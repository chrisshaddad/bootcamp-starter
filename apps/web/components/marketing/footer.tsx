import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

// Only real destinations — on-page sections and the auth routes — so nothing
// links into a page that doesn't exist yet.
const LINKS: { label: string; href: string }[] = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'AI insights', href: '#ai' },
  { label: 'Log in', href: '/login' },
  { label: 'Get started', href: '/register' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Profitability software for small businesses. Track, understand,
              and improve your margins.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Margin
          </p>
          <p className="text-xs text-muted-foreground">
            Made for small businesses that want to keep more of what they earn.
          </p>
        </div>
      </div>
    </footer>
  );
}
