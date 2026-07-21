import { Controller, Get, Patch, Body } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  notificationPreferencesUpdateRequestSchema,
  notificationPreferencesResponseSchema,
  type NotificationPreferencesUpdateRequest,
  type NotificationPreferencesResponse,
} from '@repo/contracts';

@ApiTags('settings')
@ApiCookieAuth('session')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('notifications')
  @ApiOperation({ summary: "Get the current user's notification preferences" })
  @ApiResponse({ status: 200, description: 'Notification preferences.' })
  async getNotificationPreferences(
    @CurrentUser('id') userId: string,
  ): Promise<NotificationPreferencesResponse> {
    const preference =
      await this.settingsService.getNotificationPreferences(userId);
    return notificationPreferencesResponseSchema.parse(preference);
  }

  @Patch('notifications')
  @ApiOperation({
    summary: "Update the current user's notification preferences",
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated.',
  })
  async updateNotificationPreferences(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(notificationPreferencesUpdateRequestSchema))
    body: NotificationPreferencesUpdateRequest,
  ): Promise<NotificationPreferencesResponse> {
    const preference = await this.settingsService.updateNotificationPreferences(
      userId,
      body,
    );
    return notificationPreferencesResponseSchema.parse(preference);
  }
}
