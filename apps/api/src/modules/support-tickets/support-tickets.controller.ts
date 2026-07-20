import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

@ApiTags('support-tickets')
@ApiBearerAuth()
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(
    private readonly supportTickets: SupportTicketsService,
    private readonly orgScope: OrgScopeService,
  ) {}

  // Any authenticated, provisioned user (including tenants) may list their own
  // tickets; staff see all org tickets (enforced in the service).
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.supportTickets.findAll(orgId, user.sub, role);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.supportTickets.findOne(orgId, user.sub, role, id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.supportTickets.create(orgId, user.sub, dto);
  }

  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.supportTickets.updateStatus(orgId, user.sub, role, id, dto);
  }
}
