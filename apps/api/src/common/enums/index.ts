export enum Role {
  ORG_ADMIN = 'org_admin',
  SUPERVISOR = 'supervisor',
  FINANCE = 'finance',
  MAINTENANCE = 'maintenance',
  TENANT = 'tenant',
}

/**
 * The app standardises on lowercase role values everywhere (Keycloak realm roles,
 * JWT, DTOs, FE). The Prisma `Role` enum uses UPPERCASE names. These two helpers map
 * across that single DB boundary so nothing else in the app deals with the casing.
 */
export type DbRole =
  'ORG_ADMIN' | 'SUPERVISOR' | 'FINANCE' | 'MAINTENANCE' | 'TENANT';

export const roleToDb: Record<Role, DbRole> = {
  [Role.ORG_ADMIN]: 'ORG_ADMIN',
  [Role.SUPERVISOR]: 'SUPERVISOR',
  [Role.FINANCE]: 'FINANCE',
  [Role.MAINTENANCE]: 'MAINTENANCE',
  [Role.TENANT]: 'TENANT',
};

const dbToApp: Record<DbRole, Role> = {
  ORG_ADMIN: Role.ORG_ADMIN,
  SUPERVISOR: Role.SUPERVISOR,
  FINANCE: Role.FINANCE,
  MAINTENANCE: Role.MAINTENANCE,
  TENANT: Role.TENANT,
};

export const roleFromDb = (r: string): Role =>
  dbToApp[r as DbRole] ?? Role.TENANT;

/** Highest-to-lowest authority. Used to pick a single primary role from a set. */
const ROLE_PRECEDENCE: Role[] = [
  Role.ORG_ADMIN,
  Role.SUPERVISOR,
  Role.FINANCE,
  Role.MAINTENANCE,
  Role.TENANT,
];

/** From a list of role names, return the highest-precedence app Role, or null. */
export function pickPrimaryRole(roles: readonly string[] = []): Role | null {
  const set = new Set(roles);
  return ROLE_PRECEDENCE.find((r) => set.has(r)) ?? null;
}
