import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@repo/db';

interface AuthenticatedRequest extends Request {
  user?: User;
  activeOrganizationId?: string | null;
}

/**
 * Resolves the organization id the current request is scoped to, and narrows it
 * to a non-null `string` (throwing if the caller has no org).
 *
 * Resolution order: the session's active organization (members, resolved from
 * the slug at login) falls back to the user's own `organizationId` (staff). This
 * is the single tenant-scoping helper every tenant-scoped controller should use
 * instead of re-deriving `user.organizationId` at each call site.
 *
 * @example
 * @Get()
 * findAll(@OrganizationId() organizationId: string) {
 *   return this.service.findAll(organizationId);
 * }
 */
export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const organizationId =
      request.activeOrganizationId ?? request.user?.organizationId ?? null;

    if (!organizationId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return organizationId;
  },
);
