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
import { RentersService } from './renters.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateRenterDto } from './dto/create-renter.dto';
import { UpdateRenterDto } from './dto/update-renter.dto';

@ApiTags('renters')
@ApiBearerAuth()
@Controller('renters')
export class RentersController {
  constructor(
    private readonly rentersService: RentersService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get()
  async getRenters(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.rentersService.findAll(orgId);
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get(':id')
  async getRenter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.rentersService.findOne(orgId, id);
  }

  @Roles(Role.ORG_ADMIN)
  @Post()
  async createRenter(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRenterDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.rentersService.create(orgId, user.sub, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch(':id')
  async updateRenter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRenterDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.rentersService.update(orgId, user.sub, id, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Delete(':id')
  async deleteRenter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.rentersService.remove(orgId, user.sub, id);
  }
}
