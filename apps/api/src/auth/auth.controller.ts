import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ActiveOrganizationId, CurrentUser, Public } from './decorators';
import {
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from './guards/auth.guard';
import {
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  patronRegisterRequestSchema,
  activeOrganizationRequestSchema,
  type MagicLinkRequest,
  type MagicLinkVerifyRequest,
  type PatronRegisterRequest,
  type PatronRegisterResponse,
  type ActiveOrganizationRequest,
  type UserResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerPatron(
    @Body(new ZodValidationPipe(patronRegisterRequestSchema))
    body: PatronRegisterRequest,
  ): Promise<PatronRegisterResponse> {
    return this.authService.registerPatron(body.name, body.email);
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

    // Set session cookie - deliberately no maxAge/expires, so it's a
    // browser-session cookie the browser discards when it fully closes.
    // The 7-day TTL still backstops it server-side (see SessionService).
    response.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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

  @Post('active-organization')
  @HttpCode(HttpStatus.OK)
  async setActiveOrganization(
    @CurrentUser() user: User,
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(activeOrganizationRequestSchema))
    body: ActiveOrganizationRequest,
  ): Promise<UserResponse> {
    const sessionId = request.sessionId;

    if (!sessionId) {
      throw new UnauthorizedException('No session found');
    }

    await this.authService.setActiveOrganization(
      user.id,
      sessionId,
      body.organizationId,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      activeOrganizationId: body.organizationId,
      isConfirmed: user.isConfirmed,
    };
  }

  @Get('me')
  getCurrentUser(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      activeOrganizationId,
      isConfirmed: user.isConfirmed,
    };
  }
}
