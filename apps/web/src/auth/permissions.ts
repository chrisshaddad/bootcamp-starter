/**
 * permissions.ts — single source of truth for role → area access.
 *
 * Both the sidebar (client) and page-level server guards import from here,
 * ensuring there is no divergence between what the nav shows and what pages allow.
 *
 * Area keys map 1-to-1 to dashboard sub-paths:
 *   "dashboard"   → /dashboard
 *   "buildings"   → /dashboard/buildings
 *   "users"       → /dashboard/users
 *   "payments"    → /dashboard/payments
 *   "reports"     → /dashboard/reports
 *   "billing"     → /dashboard/billing
 *   "timeline"    → /dashboard/timeline
 *   "tasks"       → /dashboard/tasks
 */

import type { Role } from '@/auth/roles';

export type DashboardArea =
  | 'dashboard'
  | 'buildings'
  | 'users'
  | 'payments'
  | 'reports'
  | 'billing'
  | 'timeline'
  | 'tasks';

/**
 * Per-role access level for an area.
 * - "full"     → full read+write (admin-level for that area)
 * - "readonly" → can view; no create/edit/delete actions shown
 * - "none"     → no access; page guard redirects, nav hides item
 */
export type AccessLevel = 'full' | 'readonly' | 'none';

type PermissionMatrix = Record<Role, Record<DashboardArea, AccessLevel>>;

export const PERMISSION_MATRIX: PermissionMatrix = {
  org_admin: {
    dashboard: 'full',
    buildings: 'full',
    users: 'full',
    payments: 'full',
    reports: 'full',
    billing: 'full',
    timeline: 'full',
    tasks: 'full',
  },
  supervisor: {
    dashboard: 'readonly',
    buildings: 'readonly',
    users: 'readonly',
    payments: 'readonly',
    reports: 'none',
    billing: 'none',
    timeline: 'readonly',
    tasks: 'none',
  },
  finance: {
    dashboard: 'readonly',
    buildings: 'readonly',
    users: 'none',
    payments: 'full',
    reports: 'full',
    billing: 'none',
    timeline: 'readonly',
    tasks: 'none',
  },
  maintenance: {
    dashboard: 'readonly',
    buildings: 'readonly',
    users: 'none',
    payments: 'none',
    reports: 'none',
    billing: 'none',
    timeline: 'readonly',
    tasks: 'full',
  },
  tenant: {
    dashboard: 'readonly',
    buildings: 'none',
    users: 'none',
    payments: 'none',
    reports: 'none',
    billing: 'none',
    timeline: 'readonly',
    tasks: 'none',
  },
};

/**
 * Returns the access level for a given role + area.
 * Defaults to "none" for unknown roles.
 */
export function getAccess(
  role: Role | null | undefined,
  area: DashboardArea,
): AccessLevel {
  if (!role) return 'none';
  return PERMISSION_MATRIX[role]?.[area] ?? 'none';
}

/**
 * Returns true if the role has any access (readonly or full) to the area.
 */
export function canAccess(
  role: Role | null | undefined,
  area: DashboardArea,
): boolean {
  return getAccess(role, area) !== 'none';
}

/**
 * Returns true if the role has full (write) access to the area.
 */
export function canWrite(
  role: Role | null | undefined,
  area: DashboardArea,
): boolean {
  return getAccess(role, area) === 'full';
}
