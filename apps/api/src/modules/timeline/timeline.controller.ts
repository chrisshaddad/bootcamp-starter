import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@ApiTags('timeline')
@ApiBearerAuth()
@Controller('timeline')
export class TimelineController {
  constructor(
    private readonly timelineService: TimelineService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Get()
  async getTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.timelineService.findForCaller(
      orgId,
      user,
      Number(page),
      Number(limit),
    );
  }
}
