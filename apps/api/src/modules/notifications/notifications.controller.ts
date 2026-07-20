import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  /** List the caller's notifications plus their current unread count. */
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.notifications.listForUser(orgId, user.sub);
  }

  /** Lightweight badge endpoint for the header bell. */
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.notifications.unreadCount(orgId, user.sub);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.notifications.markAllRead(orgId, user.sub);
  }

  @Post(':id/read')
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.notifications.markRead(orgId, user.sub, id);
  }
}
