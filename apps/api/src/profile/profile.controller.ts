import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  selfProfileUpdateRequestSchema,
  type SelfProfileResponse,
  type SelfProfileUpdateRequest,
} from '@repo/contracts';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Any authenticated user can read/update their own profile — no @Roles
  // restriction, mirroring the notifications inbox pattern.
  @Get('me')
  async getMine(@CurrentUser() user: User): Promise<SelfProfileResponse> {
    return this.profileService.getMine(user);
  }

  @Patch('me')
  async updateMine(
    @Body(new ZodValidationPipe(selfProfileUpdateRequestSchema))
    body: SelfProfileUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<SelfProfileResponse> {
    return this.profileService.updateMine(user, body);
  }
}
