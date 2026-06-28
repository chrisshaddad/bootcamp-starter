'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Forces a one-time Keycloak token refresh and re-renders the current Server
 * Component subtree when `shouldRefresh` is true.
 *
 * Used in two places:
 *   - /billing page: folds a freshly-provisioned org_id into the token before
 *     the user can reach "Subscribe" (otherwise OrgScopeService.resolveOrgId
 *     would 403 the checkout call).
 *   - /dashboard page: safety-net for the case where the orchestrator's
 *     updateSession did not manage to fold the org_admin role into the token
 *     before navigating (org ACTIVE but role still absent in session).
 *
 * NOTE: update() MUST receive a payload. next-auth only POSTs to the session
 * endpoint (→ jwt callback trigger:"update" → Keycloak refresh) when called
 * WITH data. A bare update() is a plain GET that reads, never refreshes.
 *
 * After update(), router.refresh() is called so the Server Component re-renders
 * with the new session cookie — without it, the client gets new session state
 * but the RSC still holds the stale data from the first render.
 */
export function SessionRefresher({
  shouldRefresh,
}: {
  shouldRefresh: boolean;
}) {
  const { update } = useSession();
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    if (shouldRefresh && !refreshed.current) {
      refreshed.current = true;
      void update({ refresh: Date.now() }).then(() => {
        router.refresh();
      });
    }
  }, [shouldRefresh, update, router]);

  return null;
}
