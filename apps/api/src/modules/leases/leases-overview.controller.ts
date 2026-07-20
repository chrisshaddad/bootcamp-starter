import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

/**
 * Org-wide, flat leases list (Sprint U1) — feeds the top-level
 * /dashboard/leases page. Complements (does not replace) the nested
 * buildings/:buildingId/floors/:floorId/apartments/:apartmentId/leases
 * controller, which stays scoped to a single apartment.
 */
@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesOverviewController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.FINANCE, Role.MAINTENANCE)
  @Get()
  async getLeases(@CurrentUser() user: AuthenticatedUser) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.leasesService.findAllForOrg(orgId, user.sub, role);
  }
}
