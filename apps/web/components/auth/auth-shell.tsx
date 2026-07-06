import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

/**
 * Shared chrome for the unauthenticated auth screens (login, register, verify).
 * A logo header that links home plus a centered, width-capped content column so
 * every auth card sits in the same place against the dark Margin canvas.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center px-6">
        <Link href="/" aria-label="Margin home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
