import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  activeOrganizationId?: string | null;
}

/**
 * Extracts the active organization id for the current session, attached by the
 * AuthGuard. For MEMBER users this is the library resolved from the slug at
 * login; for staff it is null (they derive their org from `user.organizationId`).
 *
 * @example
 * @Get('me')
 * getMe(@CurrentUser() user: User, @ActiveOrganizationId() activeOrgId: string | null) {
 *   return { ...user, activeOrganizationId: activeOrgId };
 * }
 */
export const ActiveOrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.activeOrganizationId ?? null;
  },
);
