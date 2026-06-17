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
import { GoalsService } from './goals.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  goalCreateRequestSchema,
  goalUpdateRequestSchema,
  type GoalCreateRequest,
  type GoalUpdateRequest,
  type GoalListResponse,
  type GoalResponse,
} from '@repo/contracts';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<GoalListResponse> {
    return this.goalsService.findAll(user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<GoalResponse> {
    return this.goalsService.findOne(id, user.organizationId!);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(goalCreateRequestSchema))
    body: GoalCreateRequest,
    @CurrentUser() user: User,
  ): Promise<GoalResponse> {
    return this.goalsService.create(user.organizationId!, user.id, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(goalUpdateRequestSchema))
    body: GoalUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<GoalResponse> {
    return this.goalsService.update(id, user.organizationId!, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.goalsService.remove(id, user.organizationId!);
  }
}
