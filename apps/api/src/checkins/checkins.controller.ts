import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CheckInsService } from './checkins.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  CheckInResponse,
  CheckInListResponse,
  CheckInCreateRequest,
} from '@repo/contracts';
import { checkInCreateRequestSchema } from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { checkInSchema, checkInListSchema } from './checkins.swagger';

@ApiTags('checkins')
@ApiCookieAuth('session-cookie')
@Controller('checkins')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  @Roles('ORG_ADMIN')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Check in a member manually',
    description:
      'Creates a check-in for a member, scoped to the gym. ORG_ADMIN only.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['memberId'],
      properties: {
        memberId: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Check-in created',
    schema: checkInSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error / Already checked in / Inactive member',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async checkIn(
    @Body(new ZodValidationPipe(checkInCreateRequestSchema))
    dto: CheckInCreateRequest,
    @CurrentUser() user: User,
  ): Promise<CheckInResponse> {
    return this.checkInsService.checkIn(user.gymId!, dto.memberId);
  }

  @Patch(':id/checkout')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Check out a member',
    description:
      'Updates a check-in record to mark the checkout time. ORG_ADMIN only.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Check-in UUID' })
  @ApiResponse({
    status: 200,
    description: 'Check-out completed',
    schema: checkInSchema,
  })
  @ApiResponse({ status: 400, description: 'Already checked out' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Check-in not found' })
  async checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<CheckInResponse> {
    return this.checkInsService.checkOut(id, user.gymId!);
  }

  @Get('all')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'List all check-ins',
    description:
      "Returns all check-ins for the caller's gym, sorted with active (not yet checked out) members first. ORG_ADMIN only.",
  })
  @ApiResponse({
    status: 200,
    description: 'List of all check-ins',
    schema: checkInListSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getCheckIns(@CurrentUser() user: User): Promise<CheckInListResponse> {
    return this.checkInsService.getCheckIns(user.gymId!);
  }
}
