import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from './auth.guard';

const ADMIN_ROLES = ['HR', 'ORG_ADMIN', 'SUPER_ADMIN'];

/**
 * Allows HR/ORG_ADMIN/SUPER_ADMIN through unconditionally, or any user who is
 * a manager (has direct reports or heads a department - see AuthService.isManager).
 * Which specific records a manager may touch is enforced in the service layer.
 */
@Injectable()
export class ManagerOrAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    if (ADMIN_ROLES.includes(user.role)) {
      return true;
    }

    const isManager = await this.authService.isManager(
      user.id,
      user.organizationId,
    );

    if (!isManager) {
      throw new ForbiddenException(
        'Only managers, HR, or org admins can manage opportunities',
      );
    }

    return true;
  }
}
