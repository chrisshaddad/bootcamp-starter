import {
  Body,
  Controller,
  ForbiddenException,
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
  createUserRequestSchema,
  updateUserRequestSchema,
  userListQuerySchema,
  type CreateUserRequest,
  type UpdateUserRequest,
  type UserActionResponse,
  type UserListResponse,
  type UserListQuery,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ORG_ADMIN')
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(userListQuerySchema)) query: UserListQuery,
  ): Promise<UserListResponse> {
    if (!user.organizationId) {
      throw new ForbiddenException(
        'No organization associated with this account',
      );
    }

    return this.usersService.findAllForOrg(user.organizationId, query);
  }

  @Post()
  @Roles('ORG_ADMIN', 'RECEPTIONIST')
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createUserRequestSchema))
    body: CreateUserRequest,
  ): Promise<UserActionResponse> {
    return this.usersService.create(user, body);
  }

  @Patch(':id')
  @Roles('ORG_ADMIN')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserRequestSchema))
    body: UpdateUserRequest,
  ): Promise<UserActionResponse> {
    if (!user.organizationId) {
      throw new ForbiddenException(
        'No organization associated with this account',
      );
    }

    return this.usersService.update(user, id, body);
  }
}
