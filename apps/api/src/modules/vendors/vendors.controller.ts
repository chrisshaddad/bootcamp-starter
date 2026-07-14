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
import { VendorsService } from './vendors.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@ApiTags('vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get()
  async getVendors(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.vendorsService.findAll(orgId);
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get(':id')
  async getVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.vendorsService.findOne(orgId, id);
  }

  @Roles(Role.ORG_ADMIN)
  @Post()
  async createVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVendorDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.vendorsService.create(orgId, user.sub, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch(':id')
  async updateVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.vendorsService.update(orgId, user.sub, id, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Delete(':id')
  async deleteVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.vendorsService.remove(orgId, user.sub, id);
  }
}
