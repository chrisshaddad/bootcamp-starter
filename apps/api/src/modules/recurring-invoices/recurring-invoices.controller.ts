import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

/**
 * Manual "generate now" trigger for recurring rent invoices (F3.1). Runs the
 * same idempotent core the daily scheduler runs, scoped to the caller's org —
 * both a real feature (an org admin doesn't have to wait for the 06:00 UTC
 * job) and the primary way to live-verify generation.
 */
@ApiTags('recurring-invoices')
@ApiBearerAuth()
@Controller('recurring-invoices')
@Roles(Role.ORG_ADMIN)
export class RecurringInvoicesController {
  constructor(
    private readonly recurringInvoices: RecurringInvoicesService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Post('run')
  async run(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.recurringInvoices.runForOrg(orgId);
  }
}
