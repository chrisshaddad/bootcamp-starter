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
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
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
import { ObjectStorageService } from '../storage/storage.service';
import { imageContentType } from './utils/image-content-type';
import {
  emailRequestSchema as emailRequestOpenApiSchema,
  loginRequestSchema as loginRequestOpenApiSchema,
  magicLinkVerifyRequestSchema as magicLinkVerifyRequestOpenApiSchema,
  profilePictureUploadSchema,
  signupRequestSchema as signupRequestOpenApiSchema,
  updateProfileRequestSchema as updateProfileRequestOpenApiSchema,
} from '../common/swagger/schemas';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  @Public()
  @Post('magic-link')
  @ApiOperation({ summary: 'Request a magic login link' })
  @ApiBody({ schema: emailRequestOpenApiSchema })
  @ApiResponse({ status: 200, description: 'Magic link request accepted' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(magicLinkRequestSchema))
  async requestMagicLink(@Body() body: MagicLinkRequest) {
    return this.authService.requestMagicLink(body.email);
  }

  @Public()
  @Post('magic-link/verify')
  @ApiOperation({ summary: 'Verify a magic login link token' })
  @ApiBody({ schema: magicLinkVerifyRequestOpenApiSchema })
  @ApiResponse({ status: 200, description: 'Authenticated user' })
  @ApiResponse({ status: 404, description: 'Invalid or expired magic link' })
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
  @ApiOperation({ summary: 'Create a developer or hiring account' })
  @ApiBody({ schema: signupRequestOpenApiSchema })
  @ApiResponse({ status: 201, description: 'Created user' })
  @ApiResponse({ status: 409, description: 'User or slug already exists' })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(signupRequestSchema))
  async signup(@Body() body: SignupRequest): Promise<AuthResponse> {
    const { user } = await this.authService.signup(body);
    return { user };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({ schema: loginRequestOpenApiSchema })
  @ApiResponse({ status: 200, description: 'Authenticated user' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Log out the current session' })
  @ApiResponse({ status: 200, description: 'Session cleared' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
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
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
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
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Upload a profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: profilePictureUploadSchema })
  @ApiResponse({ status: 200, description: 'Uploaded profile picture URL' })
  @ApiResponse({ status: 400, description: 'Invalid or missing image file' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProfilePictureUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const extension = detectImageExtension(file.buffer);
    if (!extension) {
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const stored = await this.objectStorage.upload(
      `profile-pictures/${randomUUID()}${extension}`,
      file.buffer,
      imageContentType(extension),
    );
    return {
      profilePictureUrl: stored.publicUrl,
    };
  }

  @Patch('profile')
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiBody({ schema: updateProfileRequestOpenApiSchema })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: UserResponse,
    @Body(new ZodValidationPipe(updateProfileRequestSchema))
    body: UpdateProfileRequest,
  ) {
    return this.authService.updateProfile(user.id, body);
  }
}
