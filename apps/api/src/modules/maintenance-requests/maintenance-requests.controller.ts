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
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';

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

  /**
   * MAINTENANCE is allowed past this guard (page-level 'tasks' access is
   * 'full' for that role) but the service rejects anyone but ORG_ADMIN —
   * the finer per-action rule lives below the guard, not in the frontend
   * permission matrix.
   */
  @Roles(Role.ORG_ADMIN, Role.MAINTENANCE)
  @Post()
  async createMaintenanceRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMaintenanceRequestDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.maintenanceRequestsService.create(orgId, user.sub, role, dto);
  }

  @Roles(Role.ORG_ADMIN, Role.MAINTENANCE)
  @Patch(':id')
  async updateMaintenanceRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceRequestDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.maintenanceRequestsService.update(
      orgId,
      user.sub,
      role,
      id,
      dto,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.MAINTENANCE)
  @Delete(':id')
  async deleteMaintenanceRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.maintenanceRequestsService.remove(orgId, user.sub, role, id);
  }
}
