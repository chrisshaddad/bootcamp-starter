import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AvailableUnitsService } from './available-units.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

/**
 * F6.2 — org-wide, read-only "Available units" showcase for prospective
 * renters. A separate top-level controller (mirrors LeasesOverviewController
 * / WorkOrdersOverviewController), not nested under buildings, since it lists
 * vacant apartments across the whole org rather than a single building.
 * Every member role — including TENANT — can view it; prospective tenants
 * express interest via a support ticket rather than an action here.
 */
@ApiTags('available-units')
@ApiBearerAuth()
@Controller('available-units')
export class AvailableUnitsController {
  constructor(
    private readonly availableUnitsService: AvailableUnitsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(
    Role.ORG_ADMIN,
    Role.SUPERVISOR,
    Role.FINANCE,
    Role.MAINTENANCE,
    Role.TENANT,
  )
  @Get()
  async getAvailableUnits(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.availableUnitsService.findAvailable(orgId);
  }
}
