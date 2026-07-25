import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  profileUpdateRequestSchema,
  type ProfileUpdateRequest,
  type ProfileResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

// The caller's own account settings. Not tenant-scoped and open to any
// authenticated role (staff + patrons manage their own profile here).
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async get(@CurrentUser() user: User): Promise<ProfileResponse> {
    return this.profileService.get(user.id);
  }

  @Patch()
  async update(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(profileUpdateRequestSchema))
    body: ProfileUpdateRequest,
  ): Promise<ProfileResponse> {
    return this.profileService.update(user.id, body);
  }
}
