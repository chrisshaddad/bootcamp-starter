import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
import type { User, GymStatus } from '@repo/db';
import type {
  GymListResponse,
  GymDetailResponse,
  GymActionResponse,
} from '@repo/contracts';

@ApiTags('gyms')
@ApiCookieAuth('session-cookie')
@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List all gyms', description: 'Returns a paginated list of all gyms. SUPER_ADMIN only.' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by gym status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default 20)' })
  @ApiResponse({ status: 200, description: 'List of gyms' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAll(
    @Query('status') status?: GymStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<GymListResponse> {
    return this.gymsService.findAll({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get a gym by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Gym UUID' })
  @ApiResponse({ status: 200, description: 'Gym detail' })
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
  @ApiResponse({ status: 200, description: 'Gym approved' })
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
  @ApiResponse({ status: 200, description: 'Gym rejected' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async reject(@Param('id') id: string): Promise<GymActionResponse> {
    const gym = await this.gymsService.reject(id);
    return { message: 'Gym rejected successfully', gym };
  }
}
