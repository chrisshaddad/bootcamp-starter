'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-auth';
import { getRouteLabel } from '@/lib/route-labels';

const PREVIOUS_PATH_KEY = 'nav:previous';

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
    const previous = window.sessionStorage.getItem(PREVIOUS_PATH_KEY);
    if (previous && previous !== pathname) {
      setTarget({ href: previous, label: getRouteLabel(previous) });
    }
  }, [pathname]);

  if (requireAuth && (isLoading || !user)) return null;

  return (
    <button
      type="button"
      // Always push the stored path rather than router.back(): sessionStorage
      // only remembers one previous path, not a full stack, so after
      // A -> B -> C -> B (e.g. via the browser's own back button) the label
      // here would say "Back to C" while router.back() would actually land
      // on A. Pushing the path we display keeps the destination honest.
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
