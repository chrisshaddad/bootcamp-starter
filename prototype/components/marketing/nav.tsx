import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Margin home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button render={<Link href="#features" />} variant="ghost" size="lg">
            Features
          </Button>
          <Button render={<Link href="#how" />} variant="ghost" size="lg">
            How it works
          </Button>
          <Button render={<Link href="#ai" />} variant="ghost" size="lg">
            AI insights
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button render={<Link href="/login" />} variant="ghost" size="lg">
            Log in
          </Button>
          <Button render={<Link href="/login" />} size="lg">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
