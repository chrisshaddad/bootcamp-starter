import { Controller, Get, Patch, Query, Param, Body } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  usersExploreQuerySchema,
  updateProfileRequestSchema,
  type UsersExploreQuery,
  type UpdateProfileRequest,
  type ExploreUsersResponse,
} from '@repo/contracts';
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('explore')
  @Public()
  @ApiOperation({ summary: 'Explore public users with search and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated public users list successfully retrieved.',
  })
  async exploreUsers(
    @Query(new ZodValidationPipe(usersExploreQuerySchema))
    query: UsersExploreQuery,
  ): Promise<ExploreUsersResponse> {
    const result = await this.usersService.exploreUsers(query);

    return {
      data: result.data.map((user) => ({
        id: user.id,
        accountType: user.accountType as 'DEVELOPER' | 'HIRING' | 'SUPER_ADMIN',
        developerProfile: user.developerProfile
          ? { ...user.developerProfile }
          : null,
        hiringProfile: user.hiringProfile
          ? {
              ...user.hiringProfile,
              organizationType: user.hiringProfile
                .organizationType as NonNullable<
                ExploreUsersResponse['data'][number]['hiringProfile']
              >['organizationType'],
            }
          : null,
      })),
      meta: result.meta,
    };
  }
  @Get('id/:id')
  @Public()
  @ApiOperation({ summary: 'Get a user by their unique ID' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }
  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a developer by their public slug' })
  async getUserBySlug(@Param('slug') slug: string) {
    return this.usersService.getUserBySlug(slug);
  }
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the logged-in user profile' })
  @ApiBody({
    description: 'Update user profile data',
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string' },
        publicSlug: { type: 'string' },
        headline: { type: 'string' },
        bio: { type: 'string' },
        location: { type: 'string' },
        linkedinUrl: { type: 'string' },
        personalWebsiteUrl: { type: 'string' },
        profilePictureUrl: { type: 'string' },
        organizationName: { type: 'string' },
        organizationType: { type: 'string' },
        jobTitle: { type: 'string' },
        organizationWebsiteUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict if public slug is already taken.',
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateProfileRequestSchema))
    body: UpdateProfileRequest,
  ) {
    return this.usersService.updateProfile(userId, body);
  }
}
