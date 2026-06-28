import NextAuth, { customFetch } from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

import { serverEnv } from '@/lib/env';
import { authConfig } from './auth.config';
import { pickPrimaryRole, type Role } from './roles';

type KeycloakProfile = {
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

const keycloakRealmPath = `/realms/${serverEnv.KEYCLOAK_REALM}`;
const keycloakHttpIssuer = `${serverEnv.KEYCLOAK_BASE}${keycloakRealmPath}`;
const keycloakOpenIdBase = `${keycloakHttpIssuer}/protocol/openid-connect`;
const keycloakExpectedIssuer = serverEnv.OIDC_ISSUER;

function keycloakUrl(path: string) {
  return `${keycloakHttpIssuer}${path}`;
}

function rewriteKeycloakUrl(value: string) {
  if (!value.startsWith(keycloakExpectedIssuer)) {
    return value;
  }
  return `${keycloakHttpIssuer}${value.slice(keycloakExpectedIssuer.length)}`;
}

/** Fetch to Keycloak after optional OIDC_ISSUER → KEYCLOAK_BASE URL rewrite. */
function keycloakFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  const url =
    typeof input === 'string' || input instanceof URL
      ? input.toString()
      : input.url;
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );

  return fetch(rewriteKeycloakUrl(url), {
    ...init,
    headers,
  });
}

function decodeJwtPayload(token: string | undefined) {
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded) as KeycloakProfile;
  } catch {
    return null;
  }
}

function getKeycloakRoles(profile: unknown, accessToken: string | undefined) {
  const typedProfile = profile as KeycloakProfile | undefined;
  const decodedToken = decodeJwtPayload(accessToken);
  const realmRoles =
    typedProfile?.realm_access?.roles ??
    decodedToken?.realm_access?.roles ??
    [];
  const clientRoles =
    typedProfile?.resource_access?.[serverEnv.OAUTH_CLIENT]?.roles ??
    decodedToken?.resource_access?.[serverEnv.OAUTH_CLIENT]?.roles ??
    [];

  return [...realmRoles, ...clientRoles];
}

type RefreshTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
};

const REFRESH_TOKEN_ERROR = 'RefreshAccessTokenError' as const;
const ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 30;

type RefreshableToken = Record<string, unknown> & {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  idToken?: string;
  orgId?: string | null;
  role?: Role | null;
  error?: typeof REFRESH_TOKEN_ERROR;
};

type RefreshResult = RefreshableToken;

const inflightRefreshes = new Map<string, Promise<RefreshResult>>();

async function doRefreshAccessToken(
  token: RefreshableToken,
): Promise<RefreshResult> {
  if (!token.refreshToken) {
    return {
      ...token,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
      error: REFRESH_TOKEN_ERROR,
    };
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: serverEnv.OAUTH_CLIENT,
      client_secret: serverEnv.OAUTH_SECRET,
      refresh_token: token.refreshToken,
    });

    const response = await keycloakFetch(`${keycloakOpenIdBase}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Keycloak refresh failed: ${response.status} ${body}`);
    }

    const refreshed = (await response.json()) as RefreshTokenResponse;
    const refreshedRoles = getKeycloakRoles(undefined, refreshed.access_token);
    const refreshedRole = pickPrimaryRole(refreshedRoles) ?? null;

    // TEMP DIAGNOSTIC — remove once post-payment redirect is confirmed.
    console.log('[FM-AUTH] refresh ok', {
      roles: refreshedRoles,
      picked: refreshedRole,
      orgId:
        (
          decodeJwtPayload(refreshed.access_token) as Record<
            string,
            unknown
          > | null
        )?.['org_id'] ?? null,
    });

    // Extract org_id from the refreshed access token
    const decoded = decodeJwtPayload(refreshed.access_token);
    const refreshedOrgId =
      ((decoded as Record<string, unknown> | null)?.org_id as
        string | undefined) ?? null;

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      idToken: refreshed.id_token ?? token.idToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      role: refreshedRole,
      orgId: refreshedOrgId,
      error: undefined,
    };
  } catch (error) {
    console.error('Failed to refresh Keycloak access token', error);

    // Preserve refreshToken: a transient failure (network blip, brief Keycloak
    // unavailability) should be recoverable by a subsequent explicit update().
    // Reuse is safe — the realm has revokeRefreshToken=false, so the same token
    // can be presented again. A genuinely dead token (expired/SSO ended) simply
    // fails again and the session stays errored → re-login.
    return {
      ...token,
      accessToken: undefined,
      expiresAt: undefined,
      error: REFRESH_TOKEN_ERROR,
    };
  }
}

export async function refreshAccessToken(
  token: RefreshableToken,
  forceFresh = false,
) {
  if (!token.refreshToken) {
    return doRefreshAccessToken(token);
  }

  // Explicit update() (trigger:"update") must never return a stale coalesced
  // result. The 5s post-completion cache below is meant only to merge truly
  // concurrent auto-refreshes — but it can hand back a result captured BEFORE a
  // role change (e.g. a pre-payment RSC refresh that couldn't persist its
  // rotated token), which is exactly what broke the post-payment role grant.
  if (forceFresh) {
    return doRefreshAccessToken(token);
  }

  const key = token.refreshToken;
  let refresh = inflightRefreshes.get(key);

  if (!refresh) {
    refresh = doRefreshAccessToken(token).finally(() => {
      setTimeout(() => inflightRefreshes.delete(key), 5_000);
    });
    inflightRefreshes.set(key, refresh);
  }

  return refresh;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: serverEnv.NEXTAUTH_SECRET,
  providers: [
    Keycloak({
      clientId: serverEnv.OAUTH_CLIENT,
      clientSecret: serverEnv.OAUTH_SECRET,
      issuer: keycloakHttpIssuer,
      wellKnown: keycloakUrl('/.well-known/openid-configuration'),
      authorization: `${keycloakOpenIdBase}/auth`,
      token: `${keycloakOpenIdBase}/token`,
      userinfo: `${keycloakOpenIdBase}/userinfo`,
      [customFetch]: keycloakFetch,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile, trigger }) {
      // When the client calls `update()` (e.g. after /me provisions the org and
      // backend sets org_id attribute in Keycloak, or after payment grants the
      // org_admin role), force a token refresh regardless of expiry so the new
      // role/org_id claims appear in the session immediately.
      //
      // IMPORTANT: this runs BEFORE the REFRESH_TOKEN_ERROR short-circuit below.
      // An explicit update() is the user (or our orchestrator) asking for a fresh
      // token NOW — it must be able to recover a session whose previous refresh
      // failed transiently, instead of being permanently poisoned. The error flag
      // is cleared on success and only re-set if this refresh also fails.
      if (trigger === 'update') {
        // forceFresh: bypass the inflight dedup cache so an explicit update
        // (e.g. post-payment role grant) always re-queries Keycloak.
        const refreshedToken = await refreshAccessToken(token, true);
        token.accessToken = refreshedToken.accessToken;
        token.refreshToken = refreshedToken.refreshToken;
        token.idToken = refreshedToken.idToken;
        token.expiresAt = refreshedToken.expiresAt;
        token.role = refreshedToken.role;
        token.orgId = refreshedToken.orgId;
        token.error =
          refreshedToken.error === REFRESH_TOKEN_ERROR
            ? REFRESH_TOKEN_ERROR
            : undefined;
        return token;
      }

      // Non-update calls: a session whose refresh already failed is treated as
      // dead (forces re-login at the guards/middleware) — do not keep retrying
      // on every request.
      if (token.error === REFRESH_TOKEN_ERROR) {
        return token;
      }

      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.error = undefined;
      }
      if (account?.id_token) {
        token.idToken = account.id_token;
      }

      if (account?.access_token) {
        const primaryRole = pickPrimaryRole(
          getKeycloakRoles(profile, account.access_token),
        );
        if (primaryRole) {
          token.role = primaryRole;
        }
        // Extract org_id from initial login token
        const decoded = decodeJwtPayload(account.access_token);
        const orgId = (decoded as Record<string, unknown> | null)?.org_id as
          string | undefined;
        if (orgId) {
          token.orgId = orgId;
        }
      }

      const expiresAt =
        typeof token.expiresAt === 'number' ? token.expiresAt : undefined;
      const shouldRefresh =
        !account?.access_token &&
        typeof expiresAt === 'number' &&
        Date.now() >= (expiresAt - ACCESS_TOKEN_REFRESH_SKEW_SECONDS) * 1000;

      if (shouldRefresh) {
        const refreshedToken = await refreshAccessToken(token);
        token.accessToken = refreshedToken.accessToken;
        token.refreshToken = refreshedToken.refreshToken;
        token.idToken = refreshedToken.idToken;
        token.expiresAt = refreshedToken.expiresAt;
        token.role = refreshedToken.role;
        token.orgId = refreshedToken.orgId;
        token.error =
          refreshedToken.error === REFRESH_TOKEN_ERROR
            ? REFRESH_TOKEN_ERROR
            : undefined;
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.idToken = token.idToken as string | undefined;
      session.role = token.role as Role | null | undefined;
      session.orgId = token.orgId as string | null | undefined;
      session.user.role = token.role as Role | null | undefined;
      session.error =
        token.error === REFRESH_TOKEN_ERROR ? REFRESH_TOKEN_ERROR : undefined;
      return session;
    },
  },
});
