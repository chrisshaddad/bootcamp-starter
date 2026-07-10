import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  profileUpdateRequestSchema,
  type ProfileResponse,
  type ProfileUpdateRequest,
} from '@repo/contracts';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { ProfileService } from './profile.service';

// The signed-in user's own profile. The global AuthGuard requires a valid
// session; there is no @Roles guard because every authenticated user manages
// their own profile. Scoping is by the session user id, never the request body.
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  get(@CurrentUser('id') userId: string): Promise<ProfileResponse> {
    return this.profileService.getProfile(userId);
  }

  @Patch()
  update(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(profileUpdateRequestSchema))
    body: ProfileUpdateRequest,
  ): Promise<ProfileResponse> {
    return this.profileService.updateProfile(userId, body);
  }
}
