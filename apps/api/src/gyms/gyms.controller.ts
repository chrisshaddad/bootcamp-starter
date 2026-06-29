import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
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
import { GymsService } from './gyms.service';
import { Roles, CurrentUser, Public } from '../auth/decorators';
import { GymStatus } from '@repo/db';
import type { User } from '@repo/db';
import type {
  GymListResponse,
  GymDetailResponse,
  GymActionResponse,
  GymRegisterRequest,
  GymReasonRequest,
} from '@repo/contracts';
import {
  gymRegisterRequestSchema,
  gymReasonRequestSchema,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import {
  GYM_STATUS_ENUM,
  gymUserSchema,
  gymDetailSchema,
} from './gyms.swagger';

/** Auto-generated docstring */
@ApiTags('gyms')
@ApiCookieAuth('session-cookie')
@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  /** Auto-generated docstring */
  @Post('register')
  @Public()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Register a new gym',
    description:
      'Public endpoint. Creates the gym owner account and gym record (status PENDING), then queues a magic-link email to the owner.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'ownerName', 'email', 'phone', 'address'],
      properties: {
        name: { type: 'string', example: 'Iron Paradise Gym' },
        ownerName: { type: 'string', example: 'Jane Doe' },
        email: {
          type: 'string',
          format: 'email',
          example: 'jane@ironparadise.com',
        },
        phone: { type: 'string', example: '+1-555-0100' },
        address: {
          type: 'string',
          example: '123 Main St, Springfield, IL 62701',
        },
        description: { type: 'string', example: 'A premium fitness center.' },
        website: {
          type: 'string',
          format: 'uri',
          example: 'https://ironparadise.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registration submitted — awaiting approval',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Gym registration submitted. Check your email for a login link once approved.',
        },
        gymId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already taken',
  })
  async register(
    @Body(new ZodValidationPipe(gymRegisterRequestSchema))
    dto: GymRegisterRequest,
  ): Promise<{ message: string; gymId: string }> {
    return this.gymsService.register(dto);
  }

  /** Auto-generated docstring */
  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'List all gyms',
    description: 'Returns a paginated list of all gyms. SUPER_ADMIN only.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: GYM_STATUS_ENUM,
    description: 'Filter by gym status',
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
    description: 'Page size (default 20, min 1)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of gyms',
    schema: {
      type: 'object',
      properties: {
        gyms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              status: { type: 'string', enum: GYM_STATUS_ENUM },
              website: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              createdBy: gymUserSchema,
              _count: {
                type: 'object',
                properties: { users: { type: 'number' } },
              },
            },
          },
        },
        total: { type: 'number', example: 42 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAll(
    @Query('status', new ParseEnumPipe(GymStatus, { optional: true }))
    status?: GymStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<GymListResponse> {
    return this.gymsService.findAll({ status, page, limit });
  }

  /** Auto-generated docstring */
  @Get(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get a gym by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Gym UUID' })
  @ApiResponse({
    status: 200,
    description: 'Gym detail',
    schema: gymDetailSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async findOne(@Param('id') id: string): Promise<GymDetailResponse> {
    return this.gymsService.findOne(id);
  }

  /** Auto-generated docstring */
  @Patch(':id/approve')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve a gym registration' })
  @ApiParam({ name: 'id', type: String, description: 'Gym UUID' })
  @ApiResponse({
    status: 200,
    description: 'Gym approved',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Gym approved successfully' },
        gym: gymDetailSchema,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<GymActionResponse> {
    const gym = await this.gymsService.approve(id, user.id);
    return { message: 'Gym approved successfully', gym };
  }

  /** Auto-generated docstring */
  @Patch(':id/reject')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject a gym registration' })
  @ApiParam({ name: 'id', type: String, description: 'Gym UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: {
          type: 'string',
          example: 'Incomplete business information provided.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gym rejected',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Gym rejected successfully' },
        gym: gymDetailSchema,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Reason is required' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(gymReasonRequestSchema)) body: GymReasonRequest,
  ): Promise<GymActionResponse> {
    const gym = await this.gymsService.reject(id, body.reason);
    return { message: 'Gym rejected successfully', gym };
  }

  /** Auto-generated docstring */
  @Patch(':id/suspend')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Suspend an active gym' })
  @ApiParam({ name: 'id', type: String, description: 'Gym UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', example: 'Violation of terms of service.' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gym suspended and owner sessions terminated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Gym suspended successfully' },
        gym: gymDetailSchema,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Reason is required' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async suspend(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(gymReasonRequestSchema)) body: GymReasonRequest,
  ): Promise<GymActionResponse> {
    const gym = await this.gymsService.suspend(id, body.reason);
    return { message: 'Gym suspended successfully', gym };
  }

  /** Auto-generated docstring */
  @Patch(':id/reactivate')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Reactivate a suspended gym and send the owner a new login link',
  })
  @ApiParam({ name: 'id', type: String, description: 'Gym UUID' })
  @ApiResponse({
    status: 200,
    description: 'Gym reactivated and login link sent to owner',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Gym reactivated successfully' },
        gym: gymDetailSchema,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async reactivate(@Param('id') id: string): Promise<GymActionResponse> {
    const gym = await this.gymsService.reactivate(id);
    return { message: 'Gym reactivated successfully', gym };
  }
}
