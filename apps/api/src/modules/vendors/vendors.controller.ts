import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

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
}
