import 'server-only';

import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';

import { auth } from '@/auth/auth';
import {
  dashboardPathForRole,
  normalizeRole,
  ROLE_RANK,
  type Role,
} from '@/auth/roles';
import { defaultLocale, isLocale, type Locale } from '@/i18n/config';

type RequireSessionOptions = {
  locale?: string;
  callbackUrl?: string;
};

function pickLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

function buildLoginUrl(locale: Locale, callbackUrl?: string) {
  const url = new URL(`/${locale}/login`, 'http://localhost');
  if (callbackUrl) {
    url.searchParams.set('callbackUrl', callbackUrl);
  }
  return `${url.pathname}${url.search}`;
}

/**
 * Returns the current session or redirects to the login page.
 * Use in any server component, server action, or route handler that
 * requires an authenticated user. Defense-in-depth on top of proxy.ts.
 */
export async function requireSession(
  options: RequireSessionOptions = {},
): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect(buildLoginUrl(pickLocale(options.locale), options.callbackUrl));
  }
  return session;
}

type RequireRoleOptions = RequireSessionOptions & {
  /**
   * If true, also accept users whose role outranks the requested role
   * (e.g. org_admin can access supervisor pages). Defaults to false (strict).
   */
  allowHigher?: boolean;
};

/**
 * Ensures the current session belongs to the given role. If not, the user
 * is redirected to their own dashboard (or to /unauthorized if they have
 * no recognised role at all).
 */
export async function requireRole(
  expected: Role,
  options: RequireRoleOptions = {},
): Promise<Session & { role: Role }> {
  const locale = pickLocale(options.locale);
  const session = await requireSession({
    locale,
    callbackUrl: options.callbackUrl,
  });
  const role = normalizeRole(session.user?.role ?? session.role);

  if (!role) {
    redirect(`/${locale}/unauthorized`);
  }

  const matches =
    role === expected ||
    (options.allowHigher === true && ROLE_RANK[role] >= ROLE_RANK[expected]);

  if (!matches) {
    redirect(dashboardPathForRole(role, locale));
  }

  return Object.assign(session, { role });
}

/**
 * Redirects an already-authenticated user to their own dashboard.
 * Use on /login (and other public-only pages) to avoid the
 * "logged in user sees the login screen" flicker.
 */
export async function redirectIfAuthenticated(localeInput: string | undefined) {
  const session = await auth();
  const role = normalizeRole(session?.user?.role ?? session?.role);
  if (role) {
    redirect(dashboardPathForRole(role, pickLocale(localeInput)));
  }
}

/**
 * Org status guard: if the current org is not ACTIVE, redirect to /billing.
 * Call after requireSession() in any dashboard server component.
 */
export async function requireActiveOrg(
  orgStatus: string | undefined | null,
  locale: string,
) {
  if (orgStatus && orgStatus !== 'ACTIVE') {
    redirect(`/${locale}/billing`);
  }
}
