import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  userCreateRequestSchema,
  userUpdateRequestSchema,
  userStatusRequestSchema,
  userListQuerySchema,
  type UserCreateRequest,
  type UserUpdateRequest,
  type UserStatusRequest,
  type UserListQuery,
  type UserListResponse,
  type UserDetailResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admins manage all staff/professionals; Staff may list professionals only
  // (needed to build care-team assignments). The service clamps Staff's view.
  @Get()
  @Roles('INSTITUTION_ADMIN', 'STAFF')
  async findAll(
    @Query(new ZodValidationPipe(userListQuerySchema))
    query: UserListQuery,
    @CurrentUser() user: User,
  ): Promise<UserListResponse> {
    return this.usersService.findAll(query, user);
  }

  @Get(':id')
  @Roles('INSTITUTION_ADMIN')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<UserDetailResponse> {
    return this.usersService.findOne(id, user.institutionId);
  }

  @Post()
  @Roles('INSTITUTION_ADMIN')
  async create(
    @Body(new ZodValidationPipe(userCreateRequestSchema))
    body: UserCreateRequest,
    @CurrentUser() user: User,
  ): Promise<UserDetailResponse> {
    return this.usersService.create(body, user);
  }

  @Patch(':id')
  @Roles('INSTITUTION_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userUpdateRequestSchema))
    body: UserUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<UserDetailResponse> {
    return this.usersService.update(id, body, user.institutionId);
  }

  @Patch(':id/status')
  @Roles('INSTITUTION_ADMIN')
  async setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userStatusRequestSchema))
    body: UserStatusRequest,
    @CurrentUser() user: User,
  ): Promise<UserDetailResponse> {
    return this.usersService.setStatus(id, body.isActive, user);
  }
}
