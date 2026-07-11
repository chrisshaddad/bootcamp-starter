import type { UserRole } from '@repo/contracts';

// Single source of truth for where each role lands after authenticating.
//
// The `proxy.ts` middleware can only see the session cookie, not the user's
// role (the role comes from `/auth/me`), so it cannot route by role. Instead,
// every authenticated entry point funnels to `/dashboard`, and the dashboard
// page dispatches the user to their real home using this map. Keep this in sync
// with the guarded route folders under `app/(authenticated)/`.
const ROLE_HOME: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin',
  PHARMACY_ADMIN: '/pharmacy',
  PHARMACY_MANAGER: '/branch',
  PHARMACY_EMPLOYEE: '/branch',
  STOCK_MANAGER: '/stock',
  INQUIRY_OFFICER: '/inquiries',
  // CLIENT has no back-office panel yet; keep them on the neutral landing.
  CLIENT: '/dashboard',
};

/**
 * The home page for a given role. Falls back to `/dashboard` for an unknown or
 * not-yet-loaded role, which is also the dispatcher page itself — callers should
 * treat a `/dashboard` result as "stay put, nothing to redirect to".
 */
export function homePathForRole(role: UserRole | undefined | null): string {
  if (!role) return '/dashboard';
  return ROLE_HOME[role] ?? '/dashboard';
}
