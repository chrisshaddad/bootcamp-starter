import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  PlanListResponse,
  PlanListQuery,
  PlanResponse,
  PlanCreateRequest,
  PlanUpdateRequest,
} from '@repo/contracts';
import {
  planListQuerySchema,
  planCreateRequestSchema,
  planUpdateRequestSchema,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { planSchema } from './plans.swagger';

@ApiTags('plans')
@ApiCookieAuth('session-cookie')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'List membership plans',
    description:
      "Returns a paginated list of the gym's membership plans. ORG_ADMIN only.",
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    enum: ['true', 'false'],
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of membership plans',
    schema: {
      type: 'object',
      properties: {
        plans: { type: 'array', items: planSchema },
        total: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(planListQuerySchema)) query: PlanListQuery,
  ): Promise<PlanListResponse> {
    const isActive =
      query.isActive === undefined ? undefined : query.isActive === 'true';
    return this.plansService.findAll(user.gymId!, {
      isActive,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Get a membership plan by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Plan UUID' })
  @ApiResponse({
    status: 200,
    description: 'Membership plan detail',
    schema: planSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<PlanResponse> {
    return this.plansService.findOne(id, user.gymId!);
  }

  @Post()
  @Roles('ORG_ADMIN')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a membership plan',
    description: "Creates a new membership plan in the caller's gym catalog.",
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'durationDays', 'price'],
      properties: {
        name: { type: 'string', example: 'Monthly Premium' },
        description: {
          type: 'string',
          example: 'Full access to all gym facilities',
        },
        durationDays: {
          type: 'integer',
          example: 30,
          description: 'Duration in days',
        },
        price: {
          type: 'integer',
          example: 2999,
          description: 'Price in cents (e.g. 2999 = $29.99)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Membership plan created',
    schema: planSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async create(
    @Body(new ZodValidationPipe(planCreateRequestSchema))
    dto: PlanCreateRequest,
    @CurrentUser() user: User,
  ): Promise<PlanResponse> {
    return this.plansService.create(user.gymId!, dto);
  }

  @Patch(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Update a membership plan',
    description: "Updates a plan's details or toggles its active status.",
  })
  @ApiParam({ name: 'id', type: String, description: 'Plan UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Monthly Premium' },
        description: { type: 'string', nullable: true },
        durationDays: { type: 'integer', example: 30 },
        price: {
          type: 'integer',
          example: 2999,
          description: 'Price in cents',
        },
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Membership plan updated',
    schema: planSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(planUpdateRequestSchema))
    dto: PlanUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<PlanResponse> {
    return this.plansService.update(id, user.gymId!, dto);
  }
}
