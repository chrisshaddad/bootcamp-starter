import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GymsService } from './gyms.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { GymStatus } from '@repo/db';
import type { User } from '@repo/db';
import type {
  GymListResponse,
  GymDetailResponse,
  GymActionResponse,
} from '@repo/contracts';
import {
  GYM_STATUS_ENUM,
  gymUserSchema,
  gymDetailSchema,
} from './gyms.swagger';

@ApiTags('gyms')
@ApiCookieAuth('session-cookie')
@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

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

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject a gym registration' })
  @ApiParam({ name: 'id', type: String, description: 'Gym UUID' })
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
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async reject(@Param('id') id: string): Promise<GymActionResponse> {
    const gym = await this.gymsService.reject(id);
    return { message: 'Gym rejected successfully', gym };
  }
}
