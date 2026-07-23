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
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  userListQuerySchema,
  userCreateRequestSchema,
  userUpdateRequestSchema,
  type UserListQuery,
  type UserListResponse,
  type UserCreateRequest,
  type UserUpdateRequest,
  type UserAccountResponse,
} from '@repo/contracts';

@Controller('users')
@Roles('SUPER_ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(userListQuerySchema)) query: UserListQuery,
  ): Promise<UserListResponse> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserAccountResponse> {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(userCreateRequestSchema))
    body: UserCreateRequest,
  ): Promise<UserAccountResponse> {
    return this.usersService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userUpdateRequestSchema))
    body: UserUpdateRequest,
  ): Promise<UserAccountResponse> {
    return this.usersService.update(id, body);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<UserAccountResponse> {
    return this.usersService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  async reactivate(@Param('id') id: string): Promise<UserAccountResponse> {
    return this.usersService.reactivate(id);
  }
}
