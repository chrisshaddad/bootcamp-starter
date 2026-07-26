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

  /**
   * Org-wide rent-payment register (paginated). Also serves the invoice-detail
   * payment list via `invoiceId`. A supervisor is narrowed to their assigned
   * buildings inside the service.
   */
  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get()
  async getInvoicePayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('invoiceId') invoiceId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('renterId') renterId?: string,
    @Query('method') method?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicePaymentsService.findAll(orgId, user.sub, role, {
      invoiceId,
      buildingId,
      renterId,
      method,
      from,
      to,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Declared BEFORE `:id` — Nest matches routes in declaration order, so the
   * dynamic param would otherwise swallow `/summary`.
   */
  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get('summary')
  async getInvoicePaymentSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('buildingId') buildingId?: string,
    @Query('renterId') renterId?: string,
    @Query('method') method?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicePaymentsService.summary(orgId, user.sub, role, {
      buildingId,
      renterId,
      method,
      from,
      to,
      q,
    });
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
