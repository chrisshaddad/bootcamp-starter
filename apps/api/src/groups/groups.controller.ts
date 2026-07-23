import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { User } from '@repo/db';
import {
  groupCreateRequestSchema,
  groupListQuerySchema,
  groupMembersAssignRequestSchema,
  groupUpdateRequestSchema,
  type GroupCreateRequest,
  type GroupDetailResponse,
  type GroupListQuery,
  type GroupListResponse,
  type GroupMembersAssignRequest,
  type GroupUpdateRequest,
} from '@repo/contracts';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findAll(
    @Query(new ZodValidationPipe<GroupListQuery>(groupListQuerySchema))
    query: GroupListQuery,
    @CurrentUser() user: User,
  ): Promise<GroupListResponse> {
    return this.groupsService.findAll(query, user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<GroupDetailResponse> {
    return this.groupsService.findOne(id, user);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async create(
    @Body(new ZodValidationPipe<GroupCreateRequest>(groupCreateRequestSchema))
    body: GroupCreateRequest,
    @CurrentUser() user: User,
  ): Promise<GroupDetailResponse> {
    return this.groupsService.create(body, user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe<GroupUpdateRequest>(groupUpdateRequestSchema))
    body: GroupUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<GroupDetailResponse> {
    return this.groupsService.update(id, body, user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.groupsService.remove(id, user);
  }

  @Post(':id/members')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async assignMembers(
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe<GroupMembersAssignRequest>(
        groupMembersAssignRequestSchema,
      ),
    )
    body: GroupMembersAssignRequest,
    @CurrentUser() user: User,
  ): Promise<GroupDetailResponse> {
    return this.groupsService.assignMembers(id, body, user);
  }

  @Delete(':id/members/:memberId')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: User,
  ): Promise<GroupDetailResponse> {
    return this.groupsService.removeMember(id, memberId, user);
  }
}
