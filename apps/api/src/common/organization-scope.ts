import { ForbiddenException } from '@nestjs/common';
import type { User } from '@repo/db';

/**
 * Resolves the organizationId filter for tenant-scoped list queries.
 * Super admins may optionally filter by org; all other roles are pinned to their org.
 */
export function resolveOrganizationScope(
  user: User,
  requestedOrganizationId?: string,
): string | undefined {
  if (user.role === 'SUPER_ADMIN') {
    return requestedOrganizationId;
  }

  if (!user.organizationId) {
    throw new ForbiddenException('User is not assigned to an organization');
  }

  if (
    requestedOrganizationId &&
    requestedOrganizationId !== user.organizationId
  ) {
    throw new ForbiddenException('Cannot access another organization');
  }

  return user.organizationId;
}
