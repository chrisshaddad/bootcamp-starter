import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly orgScope: OrgScopeService,
  ) {}

  /**
   * GET /users
   * - org_admin → full roster.
   * - supervisor → scoped roster (maintenance sharing their buildings).
   * - finance / maintenance → 403 (enforced in service).
   */
  @Roles(Role.ORG_ADMIN, Role.SUPERVISOR)
  @Get()
  async getUsers(@CurrentUser() user: AuthenticatedUser) {
    const { orgId, role } = await this.orgScope.resolveForCaller(user);
    return this.usersService.findAll(orgId, user.sub, role);
  }

  @Roles(Role.ORG_ADMIN)
  @Post()
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.usersService.create(orgId, user.sub, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch(':id')
  async updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.usersService.update(orgId, user.sub, id, dto);
  }

  @Roles(Role.ORG_ADMIN)
  @Delete(':id')
  async deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.usersService.remove(orgId, user.sub, id);
  }
}
