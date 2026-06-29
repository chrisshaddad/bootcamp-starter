import type { NextAuthConfig } from 'next-auth';

// Keep the NextAuth session cookie from outliving the Keycloak server-side session.
// With no maxAge the cookie defaults to ~30 days and long outlives the KC SSO session,
// eventually causing `invalid_grant: "Session not active"`.
// Keep this <= Keycloak realm "SSO Session Max" (default 10h).
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours
const SESSION_UPDATE_AGE_SECONDS = 15 * 60; // 15 minutes

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/en/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  callbacks: {
    authorized: () => true,
  },
  providers: [],
} satisfies NextAuthConfig;
