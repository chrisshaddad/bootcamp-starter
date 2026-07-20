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
  publicUserResponseSchema,
  exploreUsersResponseSchema,
  type UsersExploreQuery,
  type UpdateProfileRequest,
  type ExploreUsersResponse,
  developerPublicProfileResponseSchema,
  type DeveloperPublicProfileResponse,
} from '@repo/contracts';
import {
  developerPublicProfileResponseSchema as developerPublicProfileOpenApiSchema,
  updateProfileRequestSchema as updateProfileOpenApiSchema,
} from '../common/swagger/schemas';

// 1. Import AccountType and Roles decorators
import { AccountType } from '@repo/db';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('explore')
  @Roles(AccountType.HIRING, AccountType.SUPER_ADMIN) // 2. Restrict to Recruiter/Admin
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

    return exploreUsersResponseSchema.parse({
      data: result.data,
      meta: result.meta,
    });
  }

  @Get('id/:id')
  @Roles(AccountType.HIRING, AccountType.SUPER_ADMIN) // 3. Restrict to Recruiter/Admin
  @ApiOperation({ summary: 'Get a user by their unique ID' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    return publicUserResponseSchema.parse(user);
  }

  @Get('slug/:slug')
  @Roles(AccountType.HIRING, AccountType.SUPER_ADMIN) // 4. Restrict to Recruiter/Admin
  @ApiOperation({ summary: 'Get a developer by their public slug' })
  async getUserBySlug(@Param('slug') slug: string) {
    const user = await this.usersService.getUserBySlug(slug);
    return publicUserResponseSchema.parse(user);
  }

  @Get('developers/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a public developer portfolio by slug' })
  @ApiResponse({
    status: 200,
    description: 'Public developer portfolio with published project work.',
    schema: developerPublicProfileOpenApiSchema,
  })
  @ApiResponse({ status: 404, description: 'Developer profile not found.' })
  async getDeveloperPublicProfile(
    @Param('slug') slug: string,
  ): Promise<DeveloperPublicProfileResponse> {
    return developerPublicProfileResponseSchema.parse(
      await this.usersService.getDeveloperPublicProfile(slug),
    );
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the logged-in user profile' })
  @ApiBody({ schema: updateProfileOpenApiSchema })
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
    const user = await this.usersService.updateProfile(userId, body);
    return publicUserResponseSchema.parse(user);
  }
}
