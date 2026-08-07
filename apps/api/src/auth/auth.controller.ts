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
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
  changePasswordRequestSchema,
  deactivateAccountRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
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
  type ChangePasswordRequest,
  type DeactivateAccountRequest,
  type ForgotPasswordRequest,
  type ResetPasswordRequest,
  type SuccessResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { ObjectStorageService } from '../storage/storage.service';
import { imageContentType } from './utils/image-content-type';
import {
  emailRequestSchema as emailRequestOpenApiSchema,
  loginRequestSchema as loginRequestOpenApiSchema,
  magicLinkVerifyRequestSchema as magicLinkVerifyRequestOpenApiSchema,
  profilePictureUploadSchema,
  resetPasswordRequestSchema as resetPasswordRequestOpenApiSchema,
  signupRequestSchema as signupRequestOpenApiSchema,
  updateProfileRequestSchema as updateProfileRequestOpenApiSchema,
} from '../common/swagger/schemas';
import type { AccountType } from '@repo/db';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface PopulatedUser {
  id: string;
  email: string;
  accountType: AccountType;
  isConfirmed: boolean;
  hasSeenDashboardTour: boolean;
  developerProfile?: {
    id: string;
    publicSlug: string;
    displayName: string;
    headline?: string | null;
    bio?: string | null;
    location?: string | null;
    profilePictureUrl?: string | null;
    profilePictureOriginalUrl?: string | null;
    profilePictureCropZoom?: number | null;
    profilePictureCropX?: number | null;
    profilePictureCropY?: number | null;
    githubUsername?: string | null;
    linkedinUrl?: string | null;
    personalWebsiteUrl?: string | null;
  } | null;
  hiringProfile?: {
    id: string;
    organizationName: string;
    organizationType: 'COMPANY' | 'AGENCY' | 'INDIVIDUAL' | 'FREELANCE_CLIENT';
    jobTitle?: string | null;
    linkedinUrl?: string | null;
    organizationWebsiteUrl?: string | null;
  } | null;
}

type ProfilePictureFiles = {
  file?: Express.Multer.File[];
  originalFile?: Express.Multer.File[];
};
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

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiBody({ schema: emailRequestOpenApiSchema })
  @ApiResponse({
    status: 200,
    description: 'Password reset email queued if the account exists',
  })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(forgotPasswordRequestSchema))
  async forgotPassword(@Body() body: ForgotPasswordRequest) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using an emailed token' })
  @ApiBody({ schema: resetPasswordRequestOpenApiSchema })
  @ApiResponse({ status: 200, description: 'Password reset and authenticated' })
  @ApiResponse({ status: 404, description: 'Invalid or expired reset link' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordRequestSchema))
  async resetPassword(
    @Body() body: ResetPasswordRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { sessionId, user } = await this.authService.resetPassword(
      body.token,
      body.newPassword,
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
  getCurrentUser(@CurrentUser() user: PopulatedUser): UserResponse {
    return {
      id: user.id,
      email: user.email,
      accountType: user.accountType,
      isConfirmed: user.isConfirmed,
      hasSeenDashboardTour: user.hasSeenDashboardTour,
      developerProfile: user.developerProfile
        ? {
            id: user.developerProfile.id,
            publicSlug: user.developerProfile.publicSlug,
            displayName: user.developerProfile.displayName,
            headline: user.developerProfile.headline ?? null,
            bio: user.developerProfile.bio ?? null,
            location: user.developerProfile.location ?? null,
            profilePictureUrl: user.developerProfile.profilePictureUrl ?? null,
            profilePictureOriginalUrl:
              user.developerProfile.profilePictureOriginalUrl ?? null,
            profilePictureCropZoom:
              user.developerProfile.profilePictureCropZoom ?? null,
            profilePictureCropX:
              user.developerProfile.profilePictureCropX ?? null,
            profilePictureCropY:
              user.developerProfile.profilePictureCropY ?? null,
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
            linkedinUrl: user.hiringProfile.linkedinUrl ?? null,
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
  @ApiResponse({
    status: 200,
    description: 'Uploaded display and original profile picture URLs',
  })
  @ApiResponse({ status: 400, description: 'Invalid or missing image file' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'originalFile', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: PROFILE_PICTURE_MAX_SIZE_BYTES },
        fileFilter: (_req, file, callback) => {
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
      },
    ),
  )
  async uploadProfilePicture(
    @UploadedFiles() files: ProfilePictureFiles | undefined,
  ): Promise<ProfilePictureUploadResponse> {
    const croppedFile = files?.file?.[0];
    const originalFile = files?.originalFile?.[0];
    if (!croppedFile || !originalFile) {
      throw new BadRequestException(
        'Both the cropped photo and original photo are required',
      );
    }

    const croppedExtension = detectImageExtension(croppedFile.buffer);
    const originalExtension = detectImageExtension(originalFile.buffer);
    if (!croppedExtension || !originalExtension) {
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const cropped = await this.objectStorage.upload(
      `profile-pictures/${randomUUID()}${croppedExtension}`,
      croppedFile.buffer,
      imageContentType(croppedExtension),
    );
    try {
      const original = await this.objectStorage.upload(
        `profile-pictures/${randomUUID()}${originalExtension}`,
        originalFile.buffer,
        imageContentType(originalExtension),
      );
      return {
        profilePictureUrl: cropped.publicUrl,
        profilePictureOriginalUrl: original.publicUrl,
      };
    } catch (error) {
      await this.objectStorage.deleteMany([cropped.key]);
      throw error;
    }
  }

  @Patch('profile')
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiBody({ schema: updateProfileRequestOpenApiSchema })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: PopulatedUser,
    @Body(new ZodValidationPipe(updateProfileRequestSchema))
    body: UpdateProfileRequest,
  ) {
    return this.authService.updateProfile(user.id, body);
  }

  @Patch('password')
  @ApiCookieAuth('session')
  @ApiOperation({ summary: "Change the current user's password" })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: PopulatedUser,
    @Body(new ZodValidationPipe(changePasswordRequestSchema))
    body: ChangePasswordRequest,
  ): Promise<SuccessResponse> {
    return this.authService.changePassword(user.id, body);
  }

  @Post('deactivate')
  @ApiCookieAuth('session')
  @ApiOperation({ summary: "Deactivate the current user's account" })
  @ApiResponse({ status: 200, description: 'Account deactivated' })
  @ApiResponse({ status: 401, description: 'Password is incorrect' })
  @HttpCode(HttpStatus.OK)
  async deactivateAccount(
    @CurrentUser() user: PopulatedUser,
    @Body(new ZodValidationPipe(deactivateAccountRequestSchema))
    body: DeactivateAccountRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SuccessResponse> {
    const result = await this.authService.deactivateAccount(user.id, body);

    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return result;
  }
}
