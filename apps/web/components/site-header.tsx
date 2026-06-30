'use client';

import Link from 'next/link';
import { toast } from 'sonner';

const NAV_LINKS = ['Home', 'Projects'];

function notifyComingSoon(label: string) {
  toast.info(`${label}: this feature isn't implemented yet.`);
}

export function SiteHeader() {
  return (
    <header className="flex h-16 w-full items-center justify-between px-6 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="text-2xl text-blue">✦</span>
        <span className="text-xl font-semibold text-foreground">
          Deployfolio
        </span>
      </Link>

      <nav className="flex items-center gap-6">
        {NAV_LINKS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => notifyComingSoon(label)}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
