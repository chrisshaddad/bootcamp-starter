import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { LibraryMembersService } from './library-members.service';
import { Roles, OrganizationId } from '../auth/decorators';
import {
  libraryMemberCreateRequestSchema,
  libraryMemberUpdateRequestSchema,
  libraryMemberStatusSchema,
  libraryMembershipTypeSchema,
  libraryMemberClaimInviteRequestSchema,
  type LibraryMemberCreateRequest,
  type LibraryMemberUpdateRequest,
  type LibraryMemberResponse,
  type LibraryMemberListResponse,
  type LibraryMemberStatus,
  type LibraryMembershipType,
  type LibraryMemberActionResponse,
  type LibraryMemberClaimInviteRequest,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('library-members')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class LibraryMembersController {
  constructor(private readonly libraryMembersService: LibraryMembersService) {}

  @Get()
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('membershipStatus') membershipStatus?: string,
    @Query('membershipType') membershipType?: string,
    @Query('search') search?: string,
  ): Promise<LibraryMemberListResponse> {
    return this.libraryMembersService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      membershipStatus: membershipStatus
        ? this.parseStatus(membershipStatus)
        : undefined,
      membershipType: membershipType
        ? this.parseType(membershipType)
        : undefined,
      search,
    });
  }

  // Inherits the class-level @Roles('ORG_ADMIN', 'LIBRARIAN') - a library's
  // own staff approve/reject requests to join THEIR library, scoped by
  // @OrganizationId() same as every other route on this controller.
  @Patch(':id/approve')
  async approve(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<LibraryMemberActionResponse> {
    const libraryMember = await this.libraryMembersService.approve(
      organizationId,
      id,
    );
    return { message: 'Membership request approved', libraryMember };
  }

  @Patch(':id/reject')
  async reject(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<LibraryMemberActionResponse> {
    const libraryMember = await this.libraryMembersService.reject(
      organizationId,
      id,
    );
    return { message: 'Membership request rejected', libraryMember };
  }

  // Link a walk-in member (userId: null) to a User account and email them a
  // sign-in link. No membership-status gate (unlike approve/reject) -
  // linking an identity is orthogonal to membership status.
  @Post(':id/claim-invite')
  async sendClaimInvite(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(libraryMemberClaimInviteRequestSchema))
    body: LibraryMemberClaimInviteRequest,
  ): Promise<LibraryMemberActionResponse> {
    return this.libraryMembersService.sendClaimInvite(organizationId, id, body);
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(libraryMemberCreateRequestSchema))
    body: LibraryMemberCreateRequest,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.create(organizationId, body);
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(libraryMemberUpdateRequestSchema))
    body: LibraryMemberUpdateRequest,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.update(organizationId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.libraryMembersService.remove(organizationId, id);
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
