import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateTenantMaintenanceRequestDto } from './dto/create-tenant-maintenance-request.dto';

/**
 * Tenant self-service portal. Locked to the `tenant` role — staff roles have
 * their own richer module views and are rejected here by the RolesGuard. Scope
 * is derived entirely from the caller's Keycloak `sub` inside the service (no
 * id is accepted from the client), so cross-tenant access is structurally
 * impossible.
 */
@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
@Roles(Role.TENANT)
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = this.orgScope.resolveForCaller(user);
    return this.tenantService.getOverview(orgId, user.sub);
  }

  @Post('maintenance-requests')
  async createMaintenanceRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantMaintenanceRequestDto,
  ) {
    const { orgId } = this.orgScope.resolveForCaller(user);
    return this.tenantService.createMaintenanceRequest(orgId, user.sub, dto);
  }
}
