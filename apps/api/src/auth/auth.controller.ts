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
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import {
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from './guards/auth.guard';
import {
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  type MagicLinkRequest,
  type MagicLinkVerifyRequest,
  type UserResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ROLE_COOKIE_NAME = 'bootcamp_starter_role';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(magicLinkRequestSchema))
  async requestMagicLink(@Body() body: MagicLinkRequest) {
    return this.authService.requestMagicLink(body.email);
  }

  @Public()
  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(magicLinkVerifyRequestSchema))
  async verifyMagicLink(
    @Body() body: MagicLinkVerifyRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { sessionId, user } = await this.authService.verifyMagicLink(
      body.token,
    );

    // Set session cookie
    response.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });

    // Set role cookie (non-HttpOnly so Next.js middleware can read it for role-aware redirects)
    response.cookie(ROLE_COOKIE_NAME, user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });

    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieSessionId = request.cookies?.[SESSION_COOKIE_NAME];
    const finalSessionId = request.sessionId || cookieSessionId;

    if (finalSessionId) {
      await this.authService.logout(finalSessionId);
    }

    // Clear session cookie
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Clear role cookie
    response.clearCookie(ROLE_COOKIE_NAME, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: User): Promise<UserResponse> {
    return this.authService.getMe(user.id);
  }
}
