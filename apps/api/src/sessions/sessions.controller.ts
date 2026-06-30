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
import { SessionsService } from './sessions.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  SessionListResponse,
  SessionResponse,
  SessionCreateRequest,
  SessionUpdateRequest,
  SessionListQuery,
} from '@repo/contracts';
import {
  sessionCreateRequestSchema,
  sessionUpdateRequestSchema,
  sessionListQuerySchema,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { sessionSchema } from './sessions.swagger';

/**
 * Controller for managing gym sessions
 */
@ApiTags('sessions')
@ApiCookieAuth('session-cookie')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /** Get a list of sessions in the caller's gym */
  @Get()
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'List all sessions',
    description:
      "Returns a list of the gym's sessions, optionally filtered by date. ORG_ADMIN only.",
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter sessions starting on or after this ISO datetime',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter sessions starting on or before this ISO datetime',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['SCHEDULED', 'CANCELLED', 'COMPLETED'],
    description: 'Filter sessions by status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of sessions',
    schema: {
      type: 'array',
      items: sessionSchema,
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(sessionListQuerySchema))
    query: SessionListQuery,
  ): Promise<SessionListResponse> {
    return this.sessionsService.findAll(user.gymId!, query);
  }

  /** Get a single session by ID */
  @Get(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Session detail',
    schema: sessionSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SessionResponse> {
    return this.sessionsService.findOne(id, user.gymId!);
  }

  /** Create a new session */
  @Post()
  @Roles('ORG_ADMIN')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a session',
    description: "Creates a new session scoped to the caller's gym.",
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'startsAt', 'endsAt', 'capacity'],
      properties: {
        title: { type: 'string', example: 'Morning Yoga' },
        description: {
          type: 'string',
          example: 'A relaxing morning yoga session',
        },
        instructorId: { type: 'string', format: 'uuid' },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time' },
        capacity: { type: 'number', example: 20 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Session created',
    schema: sessionSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async create(
    @Body(new ZodValidationPipe(sessionCreateRequestSchema))
    dto: SessionCreateRequest,
    @CurrentUser() user: User,
  ): Promise<SessionResponse> {
    return this.sessionsService.create(user.gymId!, dto);
  }

  /** Update a session's details */
  @Patch(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Update a session',
    description: "Updates a session's details.",
  })
  @ApiParam({ name: 'id', type: String, description: 'Session UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Morning Yoga' },
        description: { type: 'string', nullable: true },
        instructorId: { type: 'string', format: 'uuid', nullable: true },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time' },
        capacity: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Session updated',
    schema: sessionSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(sessionUpdateRequestSchema))
    dto: SessionUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<SessionResponse> {
    return this.sessionsService.update(id, user.gymId!, dto);
  }

  /** Cancel a session */
  @Patch(':id/cancel')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Cancel a session',
    description: 'Marks a session as CANCELLED.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Session cancelled',
    schema: sessionSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SessionResponse> {
    return this.sessionsService.cancel(id, user.gymId!);
  }
}
