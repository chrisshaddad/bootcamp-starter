import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@repo/db';
import { AuthGuard, SESSION_COOKIE_NAME } from './auth.guard';
import { SessionService } from '../session.service';
import { ALLOW_PENDING_KEY, IS_PUBLIC_KEY } from '../decorators';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let sessionService: { validateSession: jest.Mock };

  const baseUser: User = {
    id: 'user-1',
    email: 'staff@pharmacy.test',
    firstName: 'Sam',
    lastName: 'Staff',
    role: 'CLIENT',
    status: 'ACTIVE',
  } as User;

  function contextWith(sessionId?: string): ExecutionContext {
    const request = { cookies: sessionId ? { [SESSION_COOKIE_NAME]: sessionId } : {} };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  // metadata: which keys the route opts into (e.g. allowPending)
  function mockMetadata(metadata: Record<string, unknown>) {
    reflector.getAllAndOverride.mockImplementation(
      (key: string) => metadata[key],
    );
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    sessionService = { validateSession: jest.fn() };
    guard = new AuthGuard(
      reflector as unknown as Reflector,
      sessionService as unknown as SessionService,
    );
  });

  it('allows public routes without a session', async () => {
    mockMetadata({ [IS_PUBLIC_KEY]: true });
    await expect(guard.canActivate(contextWith())).resolves.toBe(true);
  });

  it('allows ACTIVE users on protected routes', async () => {
    sessionService.validateSession.mockResolvedValue(baseUser);
    await expect(guard.canActivate(contextWith('sess-1'))).resolves.toBe(true);
  });

  it('default-denies PENDING users on protected routes', async () => {
    sessionService.validateSession.mockResolvedValue({
      ...baseUser,
      status: 'PENDING',
    });
    await expect(guard.canActivate(contextWith('sess-1'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows PENDING users on routes that opt in via @AllowPending', async () => {
    mockMetadata({ [ALLOW_PENDING_KEY]: true });
    sessionService.validateSession.mockResolvedValue({
      ...baseUser,
      status: 'PENDING',
    });
    await expect(guard.canActivate(contextWith('sess-1'))).resolves.toBe(true);
  });

  it('blocks SUSPENDED users even on opted-in routes', async () => {
    mockMetadata({ [ALLOW_PENDING_KEY]: true });
    sessionService.validateSession.mockResolvedValue({
      ...baseUser,
      status: 'SUSPENDED',
    });
    await expect(guard.canActivate(contextWith('sess-1'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
