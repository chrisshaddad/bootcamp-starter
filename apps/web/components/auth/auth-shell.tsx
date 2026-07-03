import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { AuthShowcase } from './auth-showcase';

// Unified soft-green page canvas shared by every auth screen.
const CANVAS_STYLE: CSSProperties = {
  backgroundImage:
    'radial-gradient(1100px 560px at 90% -10%, rgba(62,158,124,0.12), transparent 60%), ' +
    'radial-gradient(820px 460px at 4% 108%, rgba(39,163,118,0.10), transparent 55%), ' +
    'linear-gradient(158deg, #eef6f0 0%, #e4f1ea 100%)',
};

function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="flex flex-none items-center justify-between px-5 py-4 sm:px-12">
      <Link href="/login" aria-label="MedFind Lebanon home">
        <Logo />
      </Link>
      {right ? (
        <div className="text-[13px] font-semibold text-gray-600">{right}</div>
      ) : null}
    </header>
  );
}

function Footer() {
  return (
    <footer className="flex flex-none flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-4 text-xs font-medium text-gray-400">
      <span>
        © {new Date().getFullYear()} MedFind Lebanon. All rights reserved.
      </span>
      <span className="text-[#e2ede7]">•</span>
      <Link
        href="/terms"
        className="font-semibold text-gray-600 hover:text-primary-base"
      >
        Terms &amp; Conditions
      </Link>
      <Link
        href="/privacy"
        className="font-semibold text-gray-600 hover:text-primary-base"
      >
        Privacy Policy
      </Link>
    </footer>
  );
}

/**
 * Two-panel auth layout: form on the left, product showcase on the right, both
 * floating on the unified green canvas. The showcase is hidden below `lg`.
 */
export function AuthShell({
  children,
  showcase = <AuthShowcase />,
  topbarRight,
}: {
  children: ReactNode;
  showcase?: ReactNode;
  topbarRight?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col" style={CANVAS_STYLE}>
      <TopBar right={topbarRight} />
      <main className="mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-6 px-5 py-4 sm:px-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-[64px]">
        <div className="flex justify-center">{children}</div>
        <div className="hidden lg:block">{showcase}</div>
      </main>
      <Footer />
    </div>
  );
}

/**
 * Centered single-card layout on the same canvas, for transient states
 * (magic-link verify, check-your-email).
 */
export function AuthCanvas({
  children,
  topbarRight,
}: {
  children: ReactNode;
  topbarRight?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col" style={CANVAS_STYLE}>
      <TopBar right={topbarRight} />
      <main className="flex flex-1 items-center justify-center px-5 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
