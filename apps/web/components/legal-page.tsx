import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CoordlyLogo } from '@/components/coordly-logo';

interface LegalPageProps {
  title: string;
  description: string;
  effectiveDate: string;
  children: ReactNode;
}

/**
 * Renders the shared public legal page shell for Coordly policies.
 */
export function LegalPage({
  title,
  description,
  effectiveDate,
  children,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" aria-label="Go to Coordly">
            <CoordlyLogo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-primary-base"
          >
            <ArrowLeft className="size-4" />
            Back to Coordly
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="border-b border-gray-200 pb-8">
          <p className="text-sm font-semibold text-primary-base">Legal</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            {description}
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Effective {effectiveDate}
          </p>
        </div>

        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-6 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Coordly</span>
          <Link href="/terms" className="hover:text-primary-base">
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className="hover:text-primary-base">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

/**
 * Renders a titled section inside a Coordly legal page.
 */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-gray-600">
        {children}
      </div>
    </section>
  );
}
