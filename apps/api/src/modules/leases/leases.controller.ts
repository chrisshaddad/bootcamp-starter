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
import { LeasesService } from './leases.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';

@ApiTags('leases')
@ApiBearerAuth()
@Controller(
  'buildings/:buildingId/floors/:floorId/apartments/:apartmentId/leases',
)
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get()
  async getLeases(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('apartmentId') apartmentId: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.leasesService.findAll(
      orgId,
      user.sub,
      role,
      buildingId,
      floorId,
      apartmentId,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get(':id')
  async getLease(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('apartmentId') apartmentId: string,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.leasesService.findOne(
      orgId,
      user.sub,
      role,
      buildingId,
      floorId,
      apartmentId,
      id,
    );
  }

  @Roles(Role.ORG_ADMIN)
  @Post()
  async createLease(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('apartmentId') apartmentId: string,
    @Body() dto: CreateLeaseDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.leasesService.create(
      orgId,
      user.sub,
      buildingId,
      floorId,
      apartmentId,
      dto,
    );
  }

  @Roles(Role.ORG_ADMIN)
  @Patch(':id')
  async updateLease(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('apartmentId') apartmentId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaseDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.leasesService.update(
      orgId,
      user.sub,
      buildingId,
      floorId,
      apartmentId,
      id,
      dto,
    );
  }

  @Roles(Role.ORG_ADMIN)
  @Delete(':id')
  async deleteLease(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('apartmentId') apartmentId: string,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.leasesService.remove(
      orgId,
      user.sub,
      buildingId,
      floorId,
      apartmentId,
      id,
    );
  }
}
