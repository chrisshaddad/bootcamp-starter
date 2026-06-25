import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  expenseCreateRequestSchema,
  expenseUpdateRequestSchema,
  expenseQuerySchema,
  type ExpenseCreateRequest,
  type ExpenseUpdateRequest,
  type ExpenseListResponse,
  type ExpenseResponse,
} from '@repo/contracts';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(expenseQuerySchema))
    query: {
      page?: string;
      limit?: string;
      categoryId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ): Promise<ExpenseListResponse> {
    return this.expensesService.findAll(user.organizationId!, {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      categoryId: query.categoryId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ExpenseResponse> {
    return this.expensesService.findOne(id, user.organizationId!);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(expenseCreateRequestSchema))
    body: ExpenseCreateRequest,
    @CurrentUser() user: User,
  ): Promise<ExpenseResponse> {
    return this.expensesService.create(user.organizationId!, user.id, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(expenseUpdateRequestSchema))
    body: ExpenseUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<ExpenseResponse> {
    return this.expensesService.update(id, user.organizationId!, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.expensesService.remove(id, user.organizationId!);
  }
}
