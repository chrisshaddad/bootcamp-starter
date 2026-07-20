import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

/**
 * Read-only financial/operational reports. Locked to org-wide roles
 * (org_admin, finance) — supervisor/maintenance/tenant are rejected by the
 * RolesGuard, mirroring the FE `reports` permission matrix.
 */
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@Roles(Role.ORG_ADMIN, Role.FINANCE)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.reportsService.getSummary(orgId, { from, to });
  }

  @Get('rent-roll')
  async getRentRoll(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.reportsService.getRentRoll(orgId);
  }

  @Get('overdue')
  async getOverdue(
    @CurrentUser() user: AuthenticatedUser,
    @Query('asOf') asOf?: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.reportsService.getOverdue(orgId, asOf);
  }
}
