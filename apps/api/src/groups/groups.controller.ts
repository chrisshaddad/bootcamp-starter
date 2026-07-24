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
  groupCreateQuerySchema,
  groupCreateRequestSchema,
  groupListQuerySchema,
  groupMembersAssignRequestSchema,
  groupUpdateRequestSchema,
  type GroupCreateQuery,
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

  /**
   * Lists groups visible to the current admin.
   */
  @Get()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findAll(
    @Query(new ZodValidationPipe<GroupListQuery>(groupListQuerySchema))
    query: GroupListQuery,
    @CurrentUser() user: User,
  ): Promise<GroupListResponse> {
    return this.groupsService.findAll(query, user);
  }

  /**
   * Returns one group with its member roster.
   */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<GroupDetailResponse> {
    return this.groupsService.findOne(id, user);
  }

  /**
   * Creates a group in the caller's organization scope.
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async create(
    @Query(new ZodValidationPipe<GroupCreateQuery>(groupCreateQuerySchema))
    query: GroupCreateQuery,
    @Body(new ZodValidationPipe<GroupCreateRequest>(groupCreateRequestSchema))
    body: GroupCreateRequest,
    @CurrentUser() user: User,
  ): Promise<GroupDetailResponse> {
    return this.groupsService.create(body, user, query.organizationId);
  }

  /**
   * Updates an existing group's name or description.
   */
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

  /**
   * Deletes a group in the caller's organization scope.
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.groupsService.remove(id, user);
  }

  /**
   * Adds Coordly members to a group (additive assignment).
   */
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

  /**
   * Removes one Coordly member from a group.
   */
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
