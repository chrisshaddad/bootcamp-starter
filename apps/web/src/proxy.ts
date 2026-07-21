import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/auth/auth';
import { dashboardPathForRole, normalizeRole, ROLES } from '@/auth/roles';
import {
  PERMISSION_MATRIX,
  getAccess,
  type DashboardArea,
} from '@/auth/permissions';
import { defaultLocale, isLocale } from '@/i18n/config';
import type { Role } from '@/auth/roles';

const PUBLIC_FILE = /\.(.*)$/;
const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

/**
 * Route authorization model (layer #1 — pages MUST still call requireSession()/
 * requireRole() / requireActiveOrg() as defense in depth).
 *
 *   PUBLIC (always reachable):   /<locale>/unauthorized, /auth/*
 *   ANON-ONLY (authed bounced):  /<locale>            (landing root)
 *                                /<locale>/login
 *     → authed WITH role  → their dashboard
 *     → authed NO role    → /<locale>/billing (registered, not yet paid)
 *   PROTECTED (session req'd):   /<locale>/dashboard/*  (+ role/org gating in-page)
 *                                /<locale>/billing       (the pay gate)
 *     → no/expired session → /<locale>/login?callbackUrl=…
 *
 * Sub-area gating (layer #1.5): for known restricted dashboard sub-paths,
 * redirect a role that has no access back to /<locale>/dashboard.
 * This is a fast early-exit; per-page requireRole() remains the authoritative guard.
 *
 * Net effect: a logged-in user can never see the public landing/login, and an
 * anonymous user can never reach the dashboard or billing.
 */

// ---------------------------------------------------------------------------
// Sub-area gating sources DIRECTLY from the authoritative permission matrix
// (auth/permissions.ts) — no inline copy. A hand-maintained duplicate here
// previously drifted (it omitted supervisor's readonly `tasks` access), so the
// edge bounced supervisors off /dashboard/tasks even though the sidebar showed
// the link. Importing the real matrix makes divergence structurally impossible.
// permissions.ts is a plain object + pure functions (type-only Role import) →
// edge-runtime safe.
//
// `renters` has no dedicated area — it reuses the `buildings` permission.
// A sub-path not present in the matrix at all is let through (the per-page
// guard remains the authoritative gate).
// ---------------------------------------------------------------------------

const SUBAREA_ALIASES: Record<string, DashboardArea> = { renters: 'buildings' };
const KNOWN_AREAS = new Set<string>(Object.keys(PERMISSION_MATRIX.org_admin));

function roleCanAccessArea(role: Role, subArea: string): boolean {
  const area = SUBAREA_ALIASES[subArea] ?? subArea;
  if (!KNOWN_AREAS.has(area)) return true; // unknown sub-area → page guard decides
  return getAccess(role, area as DashboardArea) !== 'none';
}

// ---------------------------------------------------------------------------

function localeCookieOptions() {
  return {
    path: '/',
    sameSite: 'lax' as const,
    maxAge: LOCALE_COOKIE_MAX_AGE,
  };
}

function pickRequestLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

function redirectToLocalizedPath(request: NextRequest) {
  const locale = pickRequestLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${url.pathname === '/' ? '' : url.pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions());
  return response;
}

function loginUrl(requestUrl: URL, locale: string, error?: string) {
  const url = new URL(`/${locale}/login`, requestUrl);
  url.searchParams.set(
    'callbackUrl',
    `${requestUrl.pathname}${requestUrl.search}`,
  );
  if (error) {
    url.searchParams.set('error', error);
  }
  return url;
}

function clearSessionCookies(response: NextResponse, request: NextRequest) {
  // Auth.js splits a large session JWT into chunked cookies
  // (`authjs.session-token.0`, `.1`, …). Delete every cookie whose name matches a
  // session-token base — clearing only the un-chunked names leaves the real
  // session alive and produces a login↔dashboard redirect loop.
  for (const { name } of request.cookies.getAll()) {
    if (
      SESSION_COOKIE_NAMES.some(
        (base) => name === base || name.startsWith(`${base}.`),
      )
    ) {
      response.cookies.delete(name);
    }
  }
  return response;
}

export default auth((request) => {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  // Static assets and the NextAuth error route are always public.
  if (PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }
  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  const segments = pathname.split('/').filter(Boolean);
  const [locale, area, subArea] = segments;

  if (!isLocale(locale)) {
    return redirectToLocalizedPath(request);
  }

  const session = request.auth;
  const isAuthed = Boolean(session?.user);
  const sessionRole = normalizeRole(session?.user?.role ?? session?.role);
  const sessionExpired = session?.error === 'RefreshAccessTokenError';

  // Route classification.
  const isProtected =
    area === 'dashboard' || area === 'billing' || area === 'portal';
  const isAnonOnly = area === undefined || area === 'login'; // landing root + login

  // Direct role-named segments (e.g. /<locale>/org_admin) are not real routes →
  // funnel to the canonical dashboard.
  if (area && (ROLES as readonly string[]).includes(area)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, nextUrl));
  }

  // ── Protected pages: require a live session ──────────────────────────────
  if (isProtected) {
    if (!isAuthed || sessionExpired) {
      const response = NextResponse.redirect(
        loginUrl(
          nextUrl,
          locale,
          sessionExpired ? 'SessionExpired' : undefined,
        ),
      );
      return sessionExpired ? clearSessionCookies(response, request) : response;
    }

    // ── Portal ⇄ dashboard isolation ─────────────────────────────────────
    // Tenants live in the resident portal, never the admin dashboard shell;
    // every other role is the inverse. Keeps the two audiences fully separated
    // at the edge (the layout guards remain the authoritative gate).
    if (area === 'dashboard' && sessionRole === 'tenant') {
      return NextResponse.redirect(new URL(`/${locale}/portal`, nextUrl));
    }
    if (area === 'portal' && sessionRole && sessionRole !== 'tenant') {
      return NextResponse.redirect(
        new URL(dashboardPathForRole(sessionRole, locale), nextUrl),
      );
    }

    // ── Paywall gate — DELIBERATELY NOT done here ────────────────────────
    // "Has the user paid?" is org.status === ACTIVE in the DB, which is
    // token-independent. The session-token role, by contrast, is a copy that
    // lags until a Keycloak refresh folds it in after payment. Gating dashboard
    // access on that lagging copy caused two bugs: (1) a false "couldn't
    // activate" error on the finalize screen when the refresh hadn't landed
    // yet, and (2) a /billing ⇄ /dashboard redirect loop for an ACTIVE org
    // whose session cookie was still role-less. So the authoritative paywall
    // now lives in the dashboard RSC (requireActiveOrg via /me); the edge only
    // requires a live session. An unpaid user reaching /dashboard is bounced to
    // /billing by that one RSC check — at most one wasted render, no loop.

    // ── Sub-area gating (dashboard/* only) ──────────────────────────────
    // When a known restricted sub-area is requested and the session role
    // cannot access it, redirect to the root dashboard early. This is
    // defence-in-depth layer #1.5 — the page's own requireRole / canAccess
    // remains the authoritative gate.
    if (area === 'dashboard' && subArea && sessionRole) {
      if (!roleCanAccessArea(sessionRole, subArea)) {
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, nextUrl));
      }
    }

    // Authed: dashboard handles role/org-status gating; billing is the pay gate.
    return NextResponse.next();
  }

  // ── Anon-only pages (landing root, login): authed users get bounced ──────
  if (isAnonOnly) {
    // Expired session on landing/login: clear the stale cookies and let them re-auth.
    if (sessionExpired) {
      return clearSessionCookies(NextResponse.next(), request);
    }
    if (isAuthed) {
      if (sessionRole) {
        return NextResponse.redirect(
          new URL(dashboardPathForRole(sessionRole, locale), nextUrl),
        );
      }
      // Authed but no role yet (registered, not paid) → the billing gate, never the landing.
      return NextResponse.redirect(new URL(`/${locale}/billing`, nextUrl));
    }
    return NextResponse.next();
  }

  // Everything else (e.g. /<locale>/unauthorized) is public.
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
