import { extname, join } from 'path';
import { randomUUID } from 'crypto';
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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import {
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from './guards/auth.guard';
import {
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  loginRequestSchema,
  signupRequestSchema,
  updateProfileRequestSchema,
  type MagicLinkRequest,
  type MagicLinkVerifyRequest,
  type LoginRequest,
  type SignupRequest,
  type AuthResponse,
  type UserResponse,
  type UpdateProfileRequest,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_PROFILE_PICTURE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_PROFILE_PICTURE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

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
  ): Promise<AuthResponse> {
    const { sessionId, user } = await this.authService.verifyMagicLink(
      body.token,
    );

    response.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });

    return { user };
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(signupRequestSchema))
  async signup(@Body() body: SignupRequest): Promise<AuthResponse> {
    const { user } = await this.authService.signup(body);
    return { user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginRequestSchema))
  async login(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { sessionId, user } = await this.authService.login(body);

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

    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: UserResponse): UserResponse {
    // Explicitly mapping true database schema fields to contract shape
    return {
      id: user.id,
      email: user.email,
      accountType: user.accountType,
      isConfirmed: user.isConfirmed,
      developerProfile: user.developerProfile
        ? {
            id: user.developerProfile.id,
            publicSlug: user.developerProfile.publicSlug,
            displayName: user.developerProfile.displayName,
            headline: user.developerProfile.headline ?? null,
            bio: user.developerProfile.bio ?? null,
            location: user.developerProfile.location ?? null,
            profilePictureUrl: user.developerProfile.profilePictureUrl ?? null,
            githubUsername: user.developerProfile.githubUsername ?? null,
            linkedinUrl: user.developerProfile.linkedinUrl ?? null,
            personalWebsiteUrl:
              user.developerProfile.personalWebsiteUrl ?? null,
          }
        : null,
      hiringProfile: user.hiringProfile
        ? {
            id: user.hiringProfile.id,
            organizationName: user.hiringProfile.organizationName,
            organizationType: user.hiringProfile.organizationType,
            jobTitle: user.hiringProfile.jobTitle ?? null,
            organizationWebsiteUrl:
              user.hiringProfile.organizationWebsiteUrl ?? null,
          }
        : null,
    };
  }

  @Post('profile/picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'profile-pictures'),
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_PROFILE_PICTURE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_PROFILE_PICTURE_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, WEBP, or GIF images are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ): { profilePictureUrl: string } {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const profilePictureUrl = `${request.protocol}://${request.get('host')}/uploads/profile-pictures/${file.filename}`;
    return { profilePictureUrl };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: UserResponse,
    @Body(new ZodValidationPipe(updateProfileRequestSchema))
    body: UpdateProfileRequest,
  ) {
    return this.authService.updateProfile(user.id, body);
  }
}
