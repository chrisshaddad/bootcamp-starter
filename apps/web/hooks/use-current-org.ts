'use client';

import type { UserRole } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';

interface UseCurrentOrgReturn {
  /**
   * The organization the current user is acting within: the session's active
   * library (members, resolved from the slug) falling back to the user's own
   * `organizationId` (staff). `null` until loaded or for users with no org
   * (e.g. SUPER_ADMIN).
   */
  organizationId: string | null;
  role: UserRole | undefined;
  isStaff: boolean;
  isOrgAdmin: boolean;
  isLoading: boolean;
}

const STAFF_ROLES: UserRole[] = ['ORG_ADMIN', 'LIBRARIAN'];

/**
 * Canonical accessor for "the current library" on the web. Staff feature hooks
 * (2.2+) use this to know which org they operate on, mirroring the API's
 * `@OrganizationId()` resolution (`activeOrganizationId ?? user.organizationId`).
 */
export function useCurrentOrg(): UseCurrentOrgReturn {
  const { user, isLoading } = useUser();

  const role = user?.role;

  return {
    organizationId: user?.activeOrganizationId ?? user?.organizationId ?? null,
    role,
    isStaff: role ? STAFF_ROLES.includes(role) : false,
    isOrgAdmin: role === 'ORG_ADMIN',
    isLoading,
  };
}
