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
import { InstructorsService } from './instructors.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  InstructorListResponse,
  InstructorResponse,
  InstructorCreateRequest,
  InstructorUpdateRequest,
  InstructorListQuery,
  InstructorAvailabilityQuery,
} from '@repo/contracts';
import {
  instructorCreateRequestSchema,
  instructorUpdateRequestSchema,
  instructorListQuerySchema,
  instructorAvailabilityQuerySchema,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { instructorSchema } from './instructors.swagger';

/**
 * Controller for managing gym instructors
 */
@ApiTags('instructors')
@ApiCookieAuth('session-cookie')
@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  /**
   * NOTE: `GET /instructors/available` is declared BEFORE `GET /instructors/:id`
   * so NestJS matches the literal path segment "available" first and does not
   * treat it as a UUID param.
   */

  /** Find available instructors for a given time slot */
  @Get('available')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Find available instructors',
    description:
      'Returns instructors that do not have overlapping sessions in the given time window.',
  })
  @ApiQuery({
    name: 'startsAt',
    required: true,
    type: String,
    description: 'Start time of the session (ISO-8601 offset datetime)',
    example: '2026-06-29T09:00:00Z',
  })
  @ApiQuery({
    name: 'endsAt',
    required: true,
    type: String,
    description: 'End time of the session (ISO-8601 offset datetime)',
    example: '2026-06-29T10:00:00Z',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available instructors',
    schema: {
      type: 'object',
      properties: {
        instructors: {
          type: 'array',
          items: instructorSchema,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error — missing/invalid datetime params, or endsAt not after startsAt',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAvailable(
    @Query(new ZodValidationPipe(instructorAvailabilityQuerySchema))
    query: InstructorAvailabilityQuery,
    @CurrentUser() user: User,
  ): Promise<{ instructors: InstructorResponse[] }> {
    const instructors = await this.instructorsService.findAvailable(
      user.gymId!,
      new Date(query.startsAt),
      new Date(query.endsAt),
    );
    return { instructors };
  }

  /**
   * Get a paginated list of all instructors in the caller's gym.
   * Can be optionally filtered by active status.
   */
  @Get()
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'List all instructors',
    description: "Returns a list of the gym's instructors. ORG_ADMIN only.",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default 1, min 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default 25, min 1, max 100)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of instructors',
    schema: {
      type: 'object',
      properties: {
        instructors: {
          type: 'array',
          items: instructorSchema,
        },
        total: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(instructorListQuerySchema))
    query: InstructorListQuery,
  ): Promise<InstructorListResponse> {
    return this.instructorsService.findAll(user.gymId!, query);
  }

  /** Get a single instructor by ID */
  @Get(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Get an instructor by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Instructor UUID' })
  @ApiResponse({
    status: 200,
    description: 'Instructor detail',
    schema: instructorSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<InstructorResponse> {
    return this.instructorsService.findOne(id, user.gymId!);
  }

  /** Create a new instructor */
  @Post()
  @Roles('ORG_ADMIN')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create an instructor',
    description: "Creates a new instructor scoped to the caller's gym.",
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: {
          type: 'string',
          format: 'email',
          example: 'john@ironpeak.example.com',
        },
        specialization: { type: 'string', example: 'Yoga, Pilates' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Instructor created',
    schema: instructorSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async create(
    @Body(new ZodValidationPipe(instructorCreateRequestSchema))
    dto: InstructorCreateRequest,
    @CurrentUser() user: User,
  ): Promise<InstructorResponse> {
    return this.instructorsService.create(user.gymId!, dto);
  }

  /** Update an instructor's details or active status */
  @Patch(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Update an instructor',
    description: "Updates an instructor's details or active status.",
  })
  @ApiParam({ name: 'id', type: String, description: 'Instructor UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: {
          type: 'string',
          format: 'email',
          example: 'john@ironpeak.example.com',
        },
        specialization: { type: 'string', example: 'Yoga, Pilates' },
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Instructor updated',
    schema: instructorSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(instructorUpdateRequestSchema))
    dto: InstructorUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<InstructorResponse> {
    return this.instructorsService.update(id, user.gymId!, dto);
  }
}
