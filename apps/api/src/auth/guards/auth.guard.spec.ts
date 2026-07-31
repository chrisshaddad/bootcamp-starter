import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { User } from '@repo/db';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import type { SessionService } from '../session.service';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '../session-cookie';

describe('AuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const sessionService = {
    validateSession: jest.fn(),
  } as unknown as jest.Mocked<SessionService>;

  let guard: AuthGuard;

  function createContext(
    request: Partial<AuthenticatedRequest>,
    response: Pick<Response, 'clearCookie'>,
  ): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request as Request,
        getResponse: () => response as Response,
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);
    guard = new AuthGuard(reflector, sessionService);
  });

  it('clears the cookie when the session is invalid', async () => {
    const request = {
      cookies: { [SESSION_COOKIE_NAME]: 'stale-session' },
    };
    const response = { clearCookie: jest.fn() };
    sessionService.validateSession.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext(request, response)),
    ).rejects.toThrow(new UnauthorizedException('Invalid or expired session'));
    expect(response.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      SESSION_COOKIE_OPTIONS,
    );
  });

  it('does not clear the cookie when validation fails transiently', async () => {
    const request = {
      cookies: { [SESSION_COOKIE_NAME]: 'valid-session' },
    };
    const response = { clearCookie: jest.fn() };
    const validationError = new Error('Redis is starting');
    sessionService.validateSession.mockRejectedValue(validationError);

    await expect(
      guard.canActivate(createContext(request, response)),
    ).rejects.toBe(validationError);
    expect(response.clearCookie).not.toHaveBeenCalled();
  });

  it('attaches a valid session to the request', async () => {
    const request: Partial<AuthenticatedRequest> = {
      cookies: { [SESSION_COOKIE_NAME]: 'valid-session' },
    };
    const response = { clearCookie: jest.fn() };
    const user = { id: 'user-id' } as User;
    sessionService.validateSession.mockResolvedValue(user);

    await expect(
      guard.canActivate(createContext(request, response)),
    ).resolves.toBe(true);
    expect(request.user).toBe(user);
    expect(request.sessionId).toBe('valid-session');
    expect(response.clearCookie).not.toHaveBeenCalled();
  });
});
