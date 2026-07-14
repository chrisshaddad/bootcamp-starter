import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LibraryMembersService } from './library-members.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  libraryMemberCreateRequestSchema,
  libraryMemberUpdateRequestSchema,
  libraryMemberStatusSchema,
  libraryMembershipTypeSchema,
  type LibraryMemberCreateRequest,
  type LibraryMemberUpdateRequest,
  type LibraryMemberResponse,
  type LibraryMemberListResponse,
  type LibraryMemberStatus,
  type LibraryMembershipType,
  type LibraryMemberWithOrganizationListResponse,
  type LibraryMemberActionResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('library-members')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class LibraryMembersController {
  constructor(private readonly libraryMembersService: LibraryMembersService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('membershipStatus') membershipStatus?: string,
    @Query('membershipType') membershipType?: string,
  ): Promise<LibraryMemberListResponse> {
    return this.libraryMembersService.findAll(
      this.requireOrganizationId(user),
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        membershipStatus: membershipStatus
          ? this.parseStatus(membershipStatus)
          : undefined,
        membershipType: membershipType
          ? this.parseType(membershipType)
          : undefined,
      },
    );
  }

  // Must be registered before @Get(':id') so "pending" isn't captured as an id param.
  @Get('pending')
  @Roles('SUPER_ADMIN')
  async findAllPending(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<LibraryMemberWithOrganizationListResponse> {
    return this.libraryMembersService.findAllPending({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Patch(':id/approve')
  @Roles('SUPER_ADMIN')
  async approve(@Param('id') id: string): Promise<LibraryMemberActionResponse> {
    const libraryMember = await this.libraryMembersService.approve(id);
    return { message: 'Membership request approved', libraryMember };
  }

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN')
  async reject(@Param('id') id: string): Promise<LibraryMemberActionResponse> {
    const libraryMember = await this.libraryMembersService.reject(id);
    return { message: 'Membership request rejected', libraryMember };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.findOne(
      this.requireOrganizationId(user),
      id,
    );
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(libraryMemberCreateRequestSchema))
    body: LibraryMemberCreateRequest,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.create(
      this.requireOrganizationId(user),
      body,
    );
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(libraryMemberUpdateRequestSchema))
    body: LibraryMemberUpdateRequest,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.update(
      this.requireOrganizationId(user),
      id,
      body,
    );
  }

  private requireOrganizationId(user: User): string {
    if (!user.organizationId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.organizationId;
  }

  private parseStatus(status: string): LibraryMemberStatus {
    const result = libraryMemberStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid membershipStatus: ${status}`);
    }

    return result.data;
  }

  private parseType(type: string): LibraryMembershipType {
    const result = libraryMembershipTypeSchema.safeParse(type);

    if (!result.success) {
      throw new BadRequestException(`Invalid membershipType: ${type}`);
    }

    return result.data;
  }
}
