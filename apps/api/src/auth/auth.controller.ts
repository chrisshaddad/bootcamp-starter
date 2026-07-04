import { join } from 'path';
import { randomUUID } from 'crypto';
import { readFileSync, unlinkSync, renameSync } from 'fs';
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
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import {
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from './guards/auth.guard';
import { detectImageExtension } from './utils/detect-image-signature';
import {
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  loginRequestSchema,
  signupRequestSchema,
  updateProfileRequestSchema,
  PROFILE_PICTURE_MAX_SIZE_BYTES,
  PROFILE_PICTURE_ALLOWED_MIME_TYPES,
  type MagicLinkRequest,
  type MagicLinkVerifyRequest,
  type LoginRequest,
  type SignupRequest,
  type AuthResponse,
  type UserResponse,
  type UpdateProfileRequest,
  type ProfilePictureUploadResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PROFILE_PICTURES_DIR = join(process.cwd(), 'uploads', 'profile-pictures');

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
        destination: PROFILE_PICTURES_DIR,
        // No extension yet — the real type is only known once we've inspected
        // the file's actual bytes below, since mimetype/originalname are
        // client-supplied and can be spoofed.
        filename: (_req, _file, callback) => callback(null, randomUUID()),
      }),
      limits: { fileSize: PROFILE_PICTURE_MAX_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        // Cheap early rejection only — not trusted for the actual save below.
        if (
          !(PROFILE_PICTURE_ALLOWED_MIME_TYPES as readonly string[]).includes(
            file.mimetype,
          )
        ) {
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
  ): ProfilePictureUploadResponse {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const extension = detectImageExtension(readFileSync(file.path));
    if (!extension) {
      unlinkSync(file.path);
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const finalFilename = `${file.filename}${extension}`;
    renameSync(file.path, join(PROFILE_PICTURES_DIR, finalFilename));

    const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
    return {
      profilePictureUrl: `${apiUrl}/uploads/profile-pictures/${finalFilename}`,
    };
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
