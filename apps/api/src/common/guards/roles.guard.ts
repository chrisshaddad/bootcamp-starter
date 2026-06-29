import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators';
import { Role } from '@/common/enums';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const userRoles = new Set([
      ...(request.user?.realmRoles ?? []),
      ...(request.user?.roles ?? []),
    ]);

    if (requiredRoles.some((role) => userRoles.has(role))) {
      return true;
    }

    throw new ForbiddenException('Insufficient role for this action.');
  }
}
