import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { type User, type UserRole } from '@repo/db';
import {
  userRoleUpdateRequestSchema,
  userRoleSchema,
  type UserRoleUpdateRequest,
  type UserListResponse,
  type UserSummary,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('users')
@Roles('SUPER_ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('organizationId') organizationId?: string,
    @Query('isConfirmed') isConfirmed?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<UserListResponse> {
    return this.usersService.findAll({
      search,
      role: role ? this.parseRole(role) : undefined,
      organizationId,
      isConfirmed:
        isConfirmed === undefined ? undefined : isConfirmed === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserSummary> {
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  async changeRole(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userRoleUpdateRequestSchema))
    body: UserRoleUpdateRequest,
  ): Promise<UserSummary> {
    return this.usersService.changeRole(id, user.id, body.role);
  }

  @Patch(':id/unlink-org')
  async unlinkOrg(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<UserSummary> {
    return this.usersService.unlinkOrganization(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.usersService.remove(id, user.id);
  }

  private parseRole(role: string): UserRole {
    const result = userRoleSchema.safeParse(role);
    if (!result.success) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }
    return result.data;
  }
}
