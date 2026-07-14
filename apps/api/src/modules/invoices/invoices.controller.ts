import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

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

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Post()
  async createInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicesService.create(orgId, user.sub, role, dto);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Patch(':id')
  async updateInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicesService.update(orgId, user.sub, role, id, dto);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Delete(':id')
  async deleteInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.invoicesService.remove(orgId, user.sub, role, id);
  }
}
