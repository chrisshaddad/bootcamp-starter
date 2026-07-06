import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  userCreateRequestSchema,
  userListQuerySchema,
  userUpdateRequestSchema,
  type UserCreateRequest,
  type UserListQuery,
  type UserListResponse,
  type UserResponse,
  type UserUpdateRequest,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { UsersService } from './users.service';

// User ids are UUIDs; reject malformed path params before they reach Prisma.
const userIdSchema = z.uuid();

// Super-admin user management. The global AuthGuard already requires a valid
// session; @Roles narrows access to platform admins.
@Controller('users')
@Roles('SUPER_ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(userListQuerySchema))
    query: UserListQuery,
    @CurrentUser() actor: User,
  ): Promise<UserListResponse> {
    return this.usersService.list(query, actor.id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(userCreateRequestSchema))
    body: UserCreateRequest,
  ): Promise<UserResponse> {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ZodValidationPipe(userIdSchema)) id: string,
    @Body(new ZodValidationPipe(userUpdateRequestSchema))
    body: UserUpdateRequest,
    @CurrentUser() actor: User,
  ): Promise<UserResponse> {
    return this.usersService.update(id, body, actor);
  }

  @Delete(':id')
  remove(
    @Param('id', new ZodValidationPipe(userIdSchema)) id: string,
    @CurrentUser() actor: User,
  ): Promise<UserResponse> {
    return this.usersService.remove(id, actor);
  }
}
