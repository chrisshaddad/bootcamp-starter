'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Wraps page content with a fade-slide-up entrance animation.
 * Re-triggers the animation on route changes by toggling a key.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  return (
    <div key={key} className="page-transition">
      {children}
    </div>
  );
}
