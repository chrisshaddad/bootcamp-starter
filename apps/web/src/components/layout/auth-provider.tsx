'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/**
 * Thin client wrapper around next-auth SessionProvider.
 *
 * Required so that useSession() and its update() method (used after /me
 * provisions the org so the new org_id/role claim appears) are available inside
 * client components without making the root server layout a client component.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
