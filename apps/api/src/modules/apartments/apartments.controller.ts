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
import { ApartmentsService } from './apartments.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@ApiTags('apartments')
@ApiBearerAuth()
@Controller('buildings/:buildingId/floors/:floorId/apartments')
export class ApartmentsController {
  constructor(
    private readonly apartmentsService: ApartmentsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get()
  async getApartments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.apartmentsService.findAll(
      orgId,
      user.sub,
      role,
      buildingId,
      floorId,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get(':id')
  async getApartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.apartmentsService.findOne(
      orgId,
      user.sub,
      role,
      buildingId,
      floorId,
      id,
    );
  }

  @Roles(Role.ORG_ADMIN)
  @Post()
  async createApartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Body() dto: CreateApartmentDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.apartmentsService.create(
      orgId,
      user.sub,
      buildingId,
      floorId,
      dto,
    );
  }

  @Roles(Role.ORG_ADMIN)
  @Patch(':id')
  async updateApartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApartmentDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.apartmentsService.update(
      orgId,
      user.sub,
      buildingId,
      floorId,
      id,
      dto,
    );
  }

  @Roles(Role.ORG_ADMIN)
  @Delete(':id')
  async deleteApartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.apartmentsService.remove(
      orgId,
      user.sub,
      buildingId,
      floorId,
      id,
    );
  }
}
