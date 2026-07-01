import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import type { UserResponse } from '@repo/contracts';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SESSION_COOKIE_NAME } from './guards/auth.guard';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<
    Pick<
      AuthService,
      | 'requestMagicLink'
      | 'verifyMagicLink'
      | 'loginWithPassword'
      | 'signup'
      | 'setPassword'
      | 'logout'
    >
  >;

  const user: UserResponse = {
    id: 'user-1',
    email: 'staff@pharmacy.test',
    firstName: 'Sam',
    lastName: 'Staff',
    role: 'CLIENT',
    status: 'ACTIVE',
    pharmacyId: 'pharmacy-1',
    branchId: 'branch-1',
  };

  function mockResponse(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  }

  beforeEach(async () => {
    authService = {
      requestMagicLink: jest.fn(),
      verifyMagicLink: jest.fn(),
      loginWithPassword: jest.fn(),
      signup: jest.fn(),
      setPassword: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('sets the session cookie and returns the user', async () => {
      authService.loginWithPassword.mockResolvedValue({
        sessionId: 'session-1',
        user,
      });
      const response = mockResponse();

      const result = await controller.login(
        { email: user.email, password: 'pw' },
        response as unknown as Response,
      );

      expect(authService.loginWithPassword).toHaveBeenCalledWith(
        user.email,
        'pw',
      );
      expect(response.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'session-1',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: SESSION_MAX_AGE_MS,
        }),
      );
      expect(result).toEqual({ user });
    });
  });

  describe('verifyMagicLink', () => {
    it('sets the session cookie and returns the user', async () => {
      authService.verifyMagicLink.mockResolvedValue({
        sessionId: 'session-2',
        user,
      });
      const response = mockResponse();

      const result = await controller.verifyMagicLink(
        { token: 'tok' },
        response as unknown as Response,
      );

      expect(authService.verifyMagicLink).toHaveBeenCalledWith('tok');
      expect(response.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'session-2',
        expect.objectContaining({ maxAge: SESSION_MAX_AGE_MS }),
      );
      expect(result).toEqual({ user });
    });
  });

  describe('setPassword', () => {
    it('delegates to the service and returns the user', async () => {
      authService.setPassword.mockResolvedValue(user);

      const result = await controller.setPassword(user.id, {
        password: 'new-password',
      });

      expect(authService.setPassword).toHaveBeenCalledWith(
        user.id,
        'new-password',
      );
      expect(result).toEqual({ user });
    });
  });

  describe('logout', () => {
    it('clears the session and cookie when a session is present', async () => {
      const response = mockResponse();

      const result = await controller.logout(
        { sessionId: 'session-3' } as never,
        response as unknown as Response,
      );

      expect(authService.logout).toHaveBeenCalledWith('session-3');
      expect(response.clearCookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        expect.objectContaining({ path: '/' }),
      );
      expect(result).toEqual({ success: true });
    });

    it('clears the cookie without calling logout when no session exists', async () => {
      const response = mockResponse();

      const result = await controller.logout(
        {} as never,
        response as unknown as Response,
      );

      expect(authService.logout).not.toHaveBeenCalled();
      expect(response.clearCookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        expect.objectContaining({ path: '/' }),
      );
      expect(result).toEqual({ success: true });
    });
  });
});
