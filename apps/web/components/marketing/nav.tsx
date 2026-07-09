import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Margin home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="lg" asChild>
            <Link href="#features">Features</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href="#how">How it works</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href="#ai">AI insights</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="lg" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
