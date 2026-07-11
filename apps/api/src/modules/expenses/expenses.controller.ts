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
import { ExpensesService } from './expenses.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get()
  async getExpenses(@CurrentUser() user: AuthenticatedUser) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.expensesService.findAll(orgId, user.sub, role);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE, Role.SUPERVISOR)
  @Get(':id')
  async getExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.expensesService.findOne(orgId, user.sub, role, id);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Post()
  async createExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.expensesService.create(orgId, user.sub, role, dto);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Patch(':id')
  async updateExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.expensesService.update(orgId, user.sub, role, id, dto);
  }

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Delete(':id')
  async deleteExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.expensesService.remove(orgId, user.sub, role, id);
  }
}
