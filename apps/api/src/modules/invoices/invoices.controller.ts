import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get()
  async getInvoices(@CurrentUser() user: AuthenticatedUser) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicesService.findAll(orgId, user.sub, role);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get(':id')
  async getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicesService.findOne(orgId, user.sub, role, id);
  }
}
