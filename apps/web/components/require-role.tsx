'use client';

import type { ReactNode } from 'react';
import type { UserRole } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ForbiddenPage } from '@/components/forbidden-page';

interface RequireRoleProps {
  /** Roles allowed to view `children`. */
  roles: UserRole[];
  /** Optional message for the forbidden state. */
  forbiddenMessage?: string;
  children: ReactNode;
}

/**
 * Client-side role gate for authenticated pages. Precedence:
 *   1. while the user is loading  -> skeleton
 *   2. wrong role                 -> <ForbiddenPage/>
 *   3. allowed                    -> children
 *
 * Unauthenticated users are already redirected to /login by `useUser()`, so this
 * only screens authenticated-but-wrong-role. Wrap staff pages with
 * `<RequireRole roles={['ORG_ADMIN', 'LIBRARIAN']}>`.
 */
export function RequireRole({
  roles,
  forbiddenMessage,
  children,
}: RequireRoleProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return <ForbiddenPage message={forbiddenMessage} />;
  }

  return <>{children}</>;
}
