import { Body, Controller, Get, Post } from '@nestjs/common';
import { LibraryMembersService } from '../library-members/library-members.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  portalMembershipRequestSchema,
  type PortalMembershipRequest,
  type LibraryMemberWithOrganizationResponse,
  type LibraryMemberWithOrganizationListResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('portal/memberships')
@Roles('MEMBER')
export class PortalMembershipsController {
  constructor(private readonly libraryMembersService: LibraryMembersService) {}

  @Get()
  async findMine(
    @CurrentUser() user: User,
  ): Promise<LibraryMemberWithOrganizationListResponse> {
    return this.libraryMembersService.findMyMemberships(user.id);
  }

  @Post()
  async requestMembership(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(portalMembershipRequestSchema))
    body: PortalMembershipRequest,
  ): Promise<LibraryMemberWithOrganizationResponse> {
    return this.libraryMembersService.requestMembership(user.id, body);
  }
}
