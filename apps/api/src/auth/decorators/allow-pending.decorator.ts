import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_KEY = 'allowPending';

/**
 * Decorator to allow PENDING (not-yet-activated) accounts to reach a route.
 *
 * The auth guard default-denies PENDING users on every protected route so an
 * invited-but-unonboarded account cannot reach normal handlers. Onboarding
 * routes — namely set-password — opt back in explicitly with this decorator.
 *
 * @example
 * @AllowPending()
 * @Post('set-password')
 * setPassword() { ... }
 */
export const AllowPending = () => SetMetadata(ALLOW_PENDING_KEY, true);
