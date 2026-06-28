import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

@ApiTags('payments')
@ApiBearerAuth()
// Supervisor is read-only — no mutating payment endpoints are exposed to supervisor.
// TODO: scope by buildingId once Payment is building-linked.
@Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Get()
  async getPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.paymentsService.findAll(orgId, Number(page), Number(limit));
  }
}
