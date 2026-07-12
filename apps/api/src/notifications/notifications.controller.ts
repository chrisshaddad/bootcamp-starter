import { Controller, Get, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type { NotificationListResponse } from '@repo/contracts';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Any authenticated user can read their own inbox — no @Roles restriction.
  @Get()
  async findAll(@CurrentUser() user: User): Promise<NotificationListResponse> {
    return this.notificationsService.findForUser(user.id);
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: User): Promise<{ success: boolean }> {
    await this.notificationsService.markAllRead(user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markRead(user.id, id);
    return { success: true };
  }
}
