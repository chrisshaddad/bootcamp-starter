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
  // CLIENT lands on the consumer-facing medicine finder.
  CLIENT: '/find',
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

/**
 * A PHARMACY_EMPLOYEE gets read-only visibility of the stock & inquiries areas:
 * they can view their branch's inventory and inquiry queue but cannot mutate
 * either (add/edit/delete batches, reply to or re-status an inquiry). The API
 * enforces this too — the stock/inquiries controllers only widen their GET
 * handlers to this role — so this helper just drives the UI, hiding the
 * mutating controls. Returns false while the role is still loading.
 */
export function isReadOnlyStaff(role: UserRole | undefined | null): boolean {
  return role === 'PHARMACY_EMPLOYEE';
}
