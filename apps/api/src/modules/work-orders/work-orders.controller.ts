import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('maintenance-requests/:maintenanceRequestId/work-orders')
export class WorkOrdersController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.MAINTENANCE)
  @Get()
  async getWorkOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceRequestId') maintenanceRequestId: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.workOrdersService.findAllForRequest(
      orgId,
      user.sub,
      role,
      maintenanceRequestId,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.MAINTENANCE)
  @Get(':id')
  async getWorkOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceRequestId') maintenanceRequestId: string,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.workOrdersService.findOne(
      orgId,
      user.sub,
      role,
      maintenanceRequestId,
      id,
    );
  }
}
