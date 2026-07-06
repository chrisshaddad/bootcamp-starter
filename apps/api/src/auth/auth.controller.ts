import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators';
import {
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from './guards/auth.guard';
import {
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  registerRequestSchema,
  userProfileUpdateRequestSchema,
  type MagicLinkRequest,
  type MagicLinkVerifyRequest,
  type RegisterRequest,
  type UserResponse,
  type UserProfileUpdateRequest,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerRequestSchema))
  async register(@Body() body: RegisterRequest) {
    return this.authService.register(
      body.organizationName,
      body.name,
      body.email,
    );
  }

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

    // Clear session cookie
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Get('me')
  async getCurrentUser(
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponse> {
    const user = await this.authService.getCurrentUser(
      request.sessionId as string,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return user;
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(userProfileUpdateRequestSchema))
  async updateProfile(
    @Body() body: UserProfileUpdateRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponse> {
    return this.authService.updateProfile(request.sessionId as string, body);
  }
}
