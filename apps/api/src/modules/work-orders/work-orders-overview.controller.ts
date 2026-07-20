import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

/**
 * Org-wide "my work orders" list (Sprint F2.2) — feeds a maintenance user's
 * assigned-to-me view across every maintenance request. Complements (does
 * not replace) the nested
 * maintenance-requests/:maintenanceRequestId/work-orders controller, which
 * stays scoped to a single request.
 */
@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersOverviewController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR, Role.MAINTENANCE)
  @Get('assigned-to-me')
  async getAssignedToMe(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.workOrdersService.findAssignedToCaller(orgId, user.sub);
  }
}
