'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export function SiteHeader() {
  return (
    <header className="flex h-16 w-full items-center justify-between px-6 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="text-2xl text-primary">✦</span>
        <span className="text-xl font-semibold text-foreground">
          Deployfolio
        </span>
      </Link>

      <ThemeToggle />
    </header>
  );
}
