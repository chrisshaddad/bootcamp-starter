import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicePaymentsService } from './invoice-payments.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';

@ApiTags('invoice-payments')
@ApiBearerAuth()
@Controller('invoice-payments')
export class InvoicePaymentsController {
  constructor(
    private readonly invoicePaymentsService: InvoicePaymentsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get()
  async getInvoicePayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('invoiceId') invoiceId?: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicePaymentsService.findAll(
      orgId,
      user.sub,
      role,
      invoiceId,
    );
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get(':id')
  async getInvoicePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicePaymentsService.findOne(orgId, user.sub, role, id);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Post()
  async createInvoicePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoicePaymentDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicePaymentsService.create(orgId, user.sub, role, dto);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Delete(':id')
  async deleteInvoicePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicePaymentsService.remove(orgId, user.sub, role, id);
  }
}
