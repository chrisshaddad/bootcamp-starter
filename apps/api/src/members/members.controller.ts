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
import { MembersService } from './members.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  MemberListResponse,
  MemberListQuery,
  MemberResponse,
  MemberCreateRequest,
  MemberUpdateRequest,
  MessageResponse,
} from '@repo/contracts';
import {
  memberListQuerySchema,
  memberCreateRequestSchema,
  memberUpdateRequestSchema,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { memberSchema, MEMBER_STATUS_ENUM } from './members.swagger';

@ApiTags('members')
@ApiCookieAuth('session-cookie')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'List all members',
    description:
      "Returns a paginated list of the gym's members. ORG_ADMIN only.",
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MEMBER_STATUS_ENUM,
    description: 'Filter by member status',
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
    description: 'Paginated list of members',
    schema: {
      type: 'object',
      properties: {
        members: { type: 'array', items: memberSchema },
        total: { type: 'number', example: 42 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(memberListQuerySchema))
    query: MemberListQuery,
  ): Promise<MemberListResponse> {
    return this.membersService.findAll(user.gymId!, query);
  }

  @Get(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Get a member by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Member UUID' })
  @ApiResponse({
    status: 200,
    description: 'Member detail',
    schema: memberSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberResponse> {
    return this.membersService.findOne(id, user.gymId!);
  }

  @Post()
  @Roles('ORG_ADMIN')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a member',
    description: "Creates a new gym member scoped to the caller's gym.",
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'phoneNumber'],
      properties: {
        name: { type: 'string', example: 'Jane Doe' },
        email: { type: 'string', format: 'email', example: 'jane@example.com' },
        phoneNumber: { type: 'string', example: '+1-555-0100' },
        dateOfBirth: {
          type: 'string',
          format: 'date-time',
          example: '1990-01-15T00:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Member created',
    schema: memberSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({
    status: 409,
    description: 'Email or phone number already exists in this gym',
  })
  async create(
    @Body(new ZodValidationPipe(memberCreateRequestSchema))
    dto: MemberCreateRequest,
    @CurrentUser() user: User,
  ): Promise<MemberResponse> {
    return this.membersService.create(user.gymId!, dto);
  }

  @Post(':id/invite')
  @Roles('ORG_ADMIN')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Invite member to portal',
    description:
      'Provisions a MEMBER user account for the gym member and sends a magic-link login email. Idempotent guard: returns 409 if already invited.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Member UUID' })
  @ApiResponse({
    status: 200,
    description: 'Invite sent',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Portal invite sent successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({
    status: 409,
    description: 'Already invited or email conflict',
  })
  async invite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MessageResponse> {
    return this.membersService.invite(id, user.gymId!);
  }

  @Patch(':id')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Update a member',
    description: "Updates a member's details or status.",
  })
  @ApiParam({ name: 'id', type: String, description: 'Member UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jane Doe' },
        phoneNumber: { type: 'string', example: '+1-555-0100' },
        dateOfBirth: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '1990-01-15T00:00:00Z',
        },
        status: { type: 'string', enum: MEMBER_STATUS_ENUM },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Member updated',
    schema: memberSchema,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(memberUpdateRequestSchema))
    dto: MemberUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<MemberResponse> {
    return this.membersService.update(id, user.gymId!, dto);
  }
}
