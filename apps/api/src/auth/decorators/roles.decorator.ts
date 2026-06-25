import { SetMetadata } from '@nestjs/common';
import type { AccountType } from '@repo/db';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict route access to specific account types.
 * Use this on routes that require role-based authorization.
 *
 * @example
 * @Roles('SUPER_ADMIN')
 * @Get('admin-only')
 * getAdminData() { ... }
 */
export const Roles = (...roles: AccountType[]) => SetMetadata(ROLES_KEY, roles);
