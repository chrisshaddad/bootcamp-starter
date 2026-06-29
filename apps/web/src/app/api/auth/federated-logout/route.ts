import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/auth/auth';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Builds a Keycloak RP-initiated (front-channel) logout URL.
 *
 * The client calls this BEFORE next-auth `signOut()` so the session (and its
 * `id_token`) still exists, then redirects the browser to the returned URL.
 * Keycloak terminates the SSO session, clears its own browser cookies, and
 * redirects back to `post_logout_redirect_uri`. Without this, signing out only
 * clears the local NextAuth cookie and the next login silently re-authenticates
 * via the still-valid Keycloak SSO session.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') ?? 'en';

  const endSession = `${serverEnv.KEYCLOAK_BASE}/realms/${serverEnv.KEYCLOAK_REALM}/protocol/openid-connect/logout`;
  const params = new URLSearchParams();
  if (session?.idToken) {
    params.set('id_token_hint', session.idToken);
  }
  params.set('post_logout_redirect_uri', `${url.origin}/${locale}`);
  params.set('client_id', serverEnv.OAUTH_CLIENT);

  return NextResponse.json({ url: `${endSession}?${params.toString()}` });
}
