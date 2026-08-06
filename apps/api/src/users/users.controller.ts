import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@repo/db';
import type { UsersExploreQuery } from '@repo/contracts';
import { usersExploreQuerySchema } from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('explore')
  async exploreUsers(
    @Query(new ZodValidationPipe(usersExploreQuerySchema))
    query: UsersExploreQuery,
  ) {
    return this.usersService.exploreUsers(query);
  }

  @Post('me/enhance')
  async enhanceProfile(
    @CurrentUser() user: User,
    @Body() body: { headline: string; bio: string },
  ) {
    return this.usersService.enhanceProfile(user.id, body.headline, body.bio);
  }

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getUserById(user.id);
  }

  @Public()
  @Get('developers/:slug') // Changed from 'slug/:slug'
  async getUserBySlug(@Param('slug') slug: string) {
    return this.usersService.getDeveloperPublicProfile(slug);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }
}
