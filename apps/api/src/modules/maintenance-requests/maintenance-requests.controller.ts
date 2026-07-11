import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

@ApiTags('maintenance-requests')
@ApiBearerAuth()
@Controller('maintenance-requests')
export class MaintenanceRequestsController {
  constructor(
    private readonly maintenanceRequestsService: MaintenanceRequestsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.MAINTENANCE)
  @Get()
  async getMaintenanceRequests(@CurrentUser() user: AuthenticatedUser) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.maintenanceRequestsService.findAll(orgId, user.sub, role);
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.MAINTENANCE)
  @Get(':id')
  async getMaintenanceRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.maintenanceRequestsService.findOne(orgId, user.sub, role, id);
  }
}
