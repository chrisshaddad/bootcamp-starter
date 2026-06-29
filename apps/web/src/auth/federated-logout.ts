'use client';

import { signOut } from 'next-auth/react';

/**
 * Full logout: end the Keycloak SSO session (front-channel) AND clear the local
 * NextAuth session, so the next login requires fresh credentials instead of
 * silently re-authenticating through the Keycloak SSO cookie.
 *
 * Order matters: fetch the end-session URL while the session/id_token still
 * exists, then clear NextAuth, then hand off to Keycloak (which clears its own
 * cookies and redirects back to the localized landing page).
 */
export async function federatedLogout(locale: string): Promise<void> {
  try {
    const res = await fetch(
      `/api/auth/federated-logout?locale=${encodeURIComponent(locale)}`,
    );
    const data = (await res.json()) as { url?: string };
    await signOut({ redirect: false });
    window.location.href = data.url ?? `/${locale}`;
  } catch {
    // Fallback: at least clear the local session and return to the landing.
    await signOut({ callbackUrl: `/${locale}` });
  }
}
