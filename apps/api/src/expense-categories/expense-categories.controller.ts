import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  expenseCategoryCreateRequestSchema,
  type ExpenseCategoryCreateRequest,
  type ExpenseCategoryResponse,
} from '@repo/contracts';

@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
  ): Promise<ExpenseCategoryResponse[]> {
    return this.expenseCategoriesService.findAll(user.organizationId!);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ExpenseCategoryResponse> {
    return this.expenseCategoriesService.findOne(id, user.organizationId!);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(expenseCategoryCreateRequestSchema))
    body: ExpenseCategoryCreateRequest,
    @CurrentUser() user: User,
  ): Promise<ExpenseCategoryResponse> {
    return this.expenseCategoriesService.create(user.organizationId!, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(expenseCategoryCreateRequestSchema.partial()))
    body: Partial<ExpenseCategoryCreateRequest>,
    @CurrentUser() user: User,
  ): Promise<ExpenseCategoryResponse> {
    return this.expenseCategoriesService.update(
      id,
      user.organizationId!,
      body,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.expenseCategoriesService.remove(id, user.organizationId!);
  }

  @Post('seed-defaults')
  async seedDefaults(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.expenseCategoriesService.seedDefaults(user.organizationId!);
    return { message: 'Default categories seeded successfully' };
  }
}
