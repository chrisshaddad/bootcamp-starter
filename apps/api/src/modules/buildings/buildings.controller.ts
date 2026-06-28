import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { SetAssignmentsDto } from './dto/set-assignments.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingsController {
  constructor(
    private readonly buildingsService: BuildingsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get()
  async getBuildings(@CurrentUser() user: AuthenticatedUser) {
    const { orgId, role: callerRole } =
      await this.orgScope.resolveForCaller(user);
    return this.buildingsService.findAll(orgId, user.sub, callerRole);
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get(':id')
  async getBuilding(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role: callerRole } =
      await this.orgScope.resolveForCaller(user);
    return this.buildingsService.findOne(orgId, user.sub, callerRole, id);
  }

  @Roles(Role.ORG_ADMIN)
  @Post()
  async createBuilding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBuildingDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.buildingsService.create(orgId, user.sub, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch(':id')
  async updateBuilding(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBuildingDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.buildingsService.update(orgId, user.sub, id, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Delete(':id')
  async deleteBuilding(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.buildingsService.remove(orgId, user.sub, id);
  }

  @Roles(Role.ORG_ADMIN)
  @Put(':id/assignments')
  async setAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetAssignmentsDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.buildingsService.setAssignments(
      orgId,
      user.sub,
      id,
      dto.userIds,
    );
  }
}
