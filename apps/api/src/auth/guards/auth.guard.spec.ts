import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import type { SessionService } from '../session.service';

describe('AuthGuard', () => {
  it('clears the cookie when its session no longer exists', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const sessionService = {
      validateSession: jest.fn().mockResolvedValue(null),
    };
    const request = {
      cookies: { bootcamp_starter_session: 'missing-session-id' },
    };
    const response = { clearCookie: jest.fn() };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const guard = new AuthGuard(
      reflector as unknown as Reflector,
      sessionService as unknown as SessionService,
    );

    await expect(guard.canActivate(context)).rejects.toEqual(
      new UnauthorizedException('Invalid or expired session'),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'bootcamp_starter_session',
      expect.objectContaining({ path: '/' }),
    );
  });

  it('revokes the current session when the account is suspended', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const sessionService = {
      validateSession: jest.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        status: 'SUSPENDED',
      }),
      deleteSession: jest.fn(),
    };
    const request = {
      cookies: { bootcamp_starter_session: 'session-id' },
    };
    const response = { clearCookie: jest.fn() };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const guard = new AuthGuard(
      reflector as unknown as Reflector,
      sessionService as unknown as SessionService,
    );

    await expect(guard.canActivate(context)).rejects.toEqual(
      new UnauthorizedException('This account has been suspended'),
    );
    expect(sessionService.deleteSession).toHaveBeenCalledWith('session-id');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'bootcamp_starter_session',
      expect.objectContaining({ path: '/' }),
    );
    expect(request).not.toHaveProperty('user');
  });
});
