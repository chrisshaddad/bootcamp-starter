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
import { FloorsService } from './floors.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@ApiTags('floors')
@ApiBearerAuth()
@Controller('buildings/:buildingId/floors')
export class FloorsController {
  constructor(
    private readonly floorsService: FloorsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get()
  async getFloors(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.floorsService.findAll(orgId, user.sub, role, buildingId);
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get(':id')
  async getFloor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.floorsService.findOne(orgId, user.sub, role, buildingId, id);
  }

  @Roles(Role.ORG_ADMIN)
  @Post()
  async createFloor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateFloorDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.floorsService.create(orgId, user.sub, buildingId, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch(':id')
  async updateFloor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFloorDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.floorsService.update(orgId, user.sub, buildingId, id, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Delete(':id')
  async deleteFloor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.floorsService.remove(orgId, user.sub, buildingId, id);
  }
}
