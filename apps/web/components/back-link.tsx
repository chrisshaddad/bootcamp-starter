'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-auth';
import { getRouteLabel } from '@/lib/route-labels';
import { readNavigationStack, getPreviousPath } from '@/lib/navigation-stack';

interface BackLinkProps {
  /** Destination used when there's no known previous page (direct link, refresh, new tab). */
  fallbackHref: string;
  /** Label used with the fallback destination, e.g. "Projects" renders as "Back to Projects". */
  fallbackLabel: string;
  /** Hide entirely for signed-out visitors instead of falling back (no dashboard to send them to). */
  requireAuth?: boolean;
  className?: string;
}

export function BackLink({
  fallbackHref,
  fallbackLabel,
  requireAuth = false,
  className,
}: BackLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: false });
  const [target, setTarget] = useState<{ href: string; label: string }>({
    href: fallbackHref,
    label: fallbackLabel,
  });

  useEffect(() => {
    const previous = getPreviousPath(readNavigationStack());
    if (previous && previous !== pathname) {
      setTarget({ href: previous, label: getRouteLabel(previous) });
    }
  }, [pathname]);

  if (requireAuth && (isLoading || !user)) return null;

  return (
    <button
      type="button"
      // Always push rather than router.back(): the stack lives in
      // sessionStorage, not the real browser history, so pushing the path we
      // display is what keeps the destination and the label in sync.
      onClick={() => router.push(target.href)}
      className={cn(
        'text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:text-foreground',
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to {target.label}
    </button>
  );
}
