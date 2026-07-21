/**
 * permissions.ts — single source of truth for role → area access.
 *
 * Both the sidebar (client) and page-level server guards import from here,
 * ensuring there is no divergence between what the nav shows and what pages allow.
 *
 * Area keys map 1-to-1 to dashboard sub-paths:
 *   "dashboard"   → /dashboard
 *   "buildings"   → /dashboard/buildings (also gates /dashboard/renters — no
 *                   dedicated area; Renters reuses the buildings permission)
 *   "users"       → /dashboard/users
 *   "payments"    → /dashboard/payments
 *   "reports"     → /dashboard/reports
 *   "billing"     → /dashboard/billing
 *   "timeline"    → /dashboard/timeline
 *   "tasks"       → /dashboard/tasks
 *   "vendors"     → /dashboard/vendors (not building-scoped, unlike
 *                   "buildings" — Vendor carries no buildingId)
 *   "expenses"    → /dashboard/expenses (not building-scoped at the area
 *                   level either — a supervisor's building-scoping for
 *                   Expense is enforced server-side, not via this matrix)
 *   "invoices"    → /dashboard/invoices (covers both Invoices and Invoice
 *                   Payments together, same as "tasks" covering Maintenance
 *                   Requests + Work Orders; distinct from "payments"/"billing",
 *                   which are the platform's own Stripe subscription billing)
 *   "leases"      → /dashboard/leases (org-wide, top-level lease list; mirrors
 *                   "buildings" for access — full lease CRUD still lives under
 *                   /dashboard/buildings/:id/floors/:id/apartments/:id)
 *   "notifications" → /dashboard/notifications (a personal inbox, like the
 *                   header bell — every role gets 'full', there is no
 *                   restricted view of someone else's notifications)
 *   "availableUnits" → /dashboard/available-units (F6.2 — renter-facing vacant
 *                   units showcase; tenant gets 'full' since expressing
 *                   interest — via a support ticket — is the whole point of
 *                   the page for them; staff roles get 'readonly' visibility)
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
  | 'tasks'
  | 'vendors'
  | 'expenses'
  | 'invoices'
  | 'support'
  | 'leases'
  | 'notifications'
  | 'availableUnits';

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
    vendors: 'full',
    expenses: 'full',
    invoices: 'full',
    support: 'full',
    leases: 'full',
    notifications: 'full',
    availableUnits: 'readonly',
  },
  supervisor: {
    dashboard: 'readonly',
    buildings: 'readonly',
    users: 'readonly',
    payments: 'readonly',
    reports: 'none',
    billing: 'none',
    timeline: 'readonly',
    tasks: 'readonly',
    vendors: 'readonly',
    expenses: 'readonly',
    invoices: 'readonly',
    support: 'full',
    leases: 'readonly',
    notifications: 'full',
    availableUnits: 'readonly',
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
    vendors: 'readonly',
    expenses: 'full',
    invoices: 'full',
    support: 'readonly',
    leases: 'readonly',
    notifications: 'full',
    availableUnits: 'readonly',
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
    vendors: 'readonly',
    expenses: 'none',
    invoices: 'none',
    support: 'readonly',
    leases: 'readonly',
    notifications: 'full',
    availableUnits: 'readonly',
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
    vendors: 'none',
    expenses: 'none',
    invoices: 'none',
    // readonly = the tenant sees the Support area and can open tickets (the
    // "New ticket" button is unconditional), but NOT the staff-only status
    // transition actions (acknowledge/resolve/close), which the API 403s anyway.
    support: 'readonly',
    leases: 'none',
    notifications: 'full',
    // full = this page IS the tenant's flow (browse vacant units → express
    // interest via a support ticket); there's no write action to restrict.
    availableUnits: 'full',
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
