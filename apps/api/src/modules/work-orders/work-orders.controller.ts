import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

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

  /**
   * MAINTENANCE is allowed past this guard so its own-assigned-status-update
   * path in the service is reachable (create/reassign/delete still 403 in
   * the service) — same layering as MaintenanceRequestsController's writes.
   */
  @Roles(Role.ORG_ADMIN, Role.MAINTENANCE)
  @Post()
  async createWorkOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceRequestId') maintenanceRequestId: string,
    @Body() dto: CreateWorkOrderDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.workOrdersService.create(
      orgId,
      user.sub,
      role,
      maintenanceRequestId,
      dto,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.MAINTENANCE)
  @Patch(':id')
  async updateWorkOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceRequestId') maintenanceRequestId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.workOrdersService.update(
      orgId,
      user.sub,
      user.sub,
      role,
      maintenanceRequestId,
      id,
      dto,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.MAINTENANCE)
  @Delete(':id')
  async deleteWorkOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceRequestId') maintenanceRequestId: string,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.workOrdersService.remove(
      orgId,
      user.sub,
      role,
      maintenanceRequestId,
      id,
    );
  }
}
