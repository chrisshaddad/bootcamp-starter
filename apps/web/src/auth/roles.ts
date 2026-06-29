// Forward-Mena roles — matches Keycloak realm roles in prorentallb realm.
// org_admin is the highest; tenant is the most restricted (self-only).
export const ROLES = [
  'org_admin',
  'supervisor',
  'finance',
  'maintenance',
  'tenant',
] as const;

export type Role = (typeof ROLES)[number];

const ROLE_ALIASES: Record<string, Role> = {
  org_admin: 'org_admin',
  OrgAdmin: 'org_admin',
  orgAdmin: 'org_admin',
  ORG_ADMIN: 'org_admin',
  supervisor: 'supervisor',
  Supervisor: 'supervisor',
  SUPERVISOR: 'supervisor',
  finance: 'finance',
  Finance: 'finance',
  FINANCE: 'finance',
  maintenance: 'maintenance',
  Maintenance: 'maintenance',
  MAINTENANCE: 'maintenance',
  tenant: 'tenant',
  Tenant: 'tenant',
  TENANT: 'tenant',
};

/** Maps each role to its primary dashboard sub-path (under /[lang]/dashboard). */
export const ROLE_DASHBOARD: Record<Role, string> = {
  org_admin: '/dashboard',
  supervisor: '/dashboard',
  finance: '/dashboard',
  maintenance: '/dashboard',
  tenant: '/dashboard',
};

/**
 * Role precedence for `pickPrimaryRole`.
 * A user may carry multiple realm roles from Keycloak; we surface the highest.
 */
const ROLE_PRECEDENCE: Role[] = [
  'org_admin',
  'supervisor',
  'finance',
  'maintenance',
  'tenant',
];

export function normalizeRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  return ROLE_ALIASES[role] ?? ROLE_ALIASES[role.toLowerCase()] ?? null;
}

export function isRole(role: string | undefined | null): role is Role {
  return normalizeRole(role) !== null;
}

/**
 * From the list of Keycloak realm roles, pick the single primary role
 * using the precedence table (org_admin > supervisor > finance > maintenance > tenant).
 */
export function pickPrimaryRole(roles: readonly string[] = []): Role | null {
  const normalized = new Set(
    roles.map(normalizeRole).filter(Boolean) as Role[],
  );
  return ROLE_PRECEDENCE.find((role) => normalized.has(role)) ?? null;
}

export function dashboardPathForRole(role: Role, locale: string) {
  return `/${locale}${ROLE_DASHBOARD[role]}`;
}

/** Numeric rank used by requireRole({ allowHigher: true }). */
export const ROLE_RANK: Record<Role, number> = {
  org_admin: 5,
  supervisor: 4,
  finance: 3,
  maintenance: 2,
  tenant: 1,
};
