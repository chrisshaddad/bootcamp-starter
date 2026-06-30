import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service';
import { AllowPending, CurrentUser, Public } from './decorators';
import {
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from './guards/auth.guard';
import {
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  passwordLoginRequestSchema,
  signupRequestSchema,
  setPasswordRequestSchema,
  type MagicLinkRequest,
  type MagicLinkVerifyRequest,
  type PasswordLoginRequest,
  type SignupRequest,
  type SetPasswordRequest,
  type UserResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sessionCookieOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(magicLinkRequestSchema))
  async requestMagicLink(@Body() body: MagicLinkRequest) {
    return this.authService.requestMagicLink(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(magicLinkVerifyRequestSchema))
  async verifyMagicLink(
    @Body() body: MagicLinkVerifyRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: UserResponse }> {
    const { sessionId, user } = await this.authService.verifyMagicLink(
      body.token,
    );

    response.cookie(
      SESSION_COOKIE_NAME,
      sessionId,
      sessionCookieOptions(SESSION_MAX_AGE_MS),
    );

    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(passwordLoginRequestSchema))
  async login(
    @Body() body: PasswordLoginRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: UserResponse }> {
    const { sessionId, user } = await this.authService.loginWithPassword(
      body.email,
      body.password,
    );

    response.cookie(
      SESSION_COOKIE_NAME,
      sessionId,
      sessionCookieOptions(SESSION_MAX_AGE_MS),
    );

    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(signupRequestSchema))
  async signup(@Body() body: SignupRequest) {
    return this.authService.signup(body);
  }

  @AllowPending()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @CurrentUser('id') userId: string,
    // Pipe is scoped to the body param: @UsePipes would also run it against the
    // @CurrentUser('id') string and reject it as "not an object".
    @Body(new ZodValidationPipe(setPasswordRequestSchema))
    body: SetPasswordRequest,
  ): Promise<{ user: UserResponse }> {
    const user = await this.authService.setPassword(userId, body.password);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const sessionId = request.sessionId;

    if (sessionId) {
      await this.authService.logout(sessionId);
    }

    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());

    return { success: true };
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      pharmacyId: user.pharmacyId,
      branchId: user.branchId,
    };
  }
}
