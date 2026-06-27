import { Controller, Get, Query } from '@nestjs/common';
import { MembersService } from './members.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  memberListQuerySchema,
  type MemberListQuery,
  type MemberListResponse,
} from '@repo/contracts';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findAll(
    @Query(new ZodValidationPipe<MemberListQuery>(memberListQuerySchema))
    query: MemberListQuery,
    @CurrentUser() user: User,
  ): Promise<MemberListResponse> {
    return this.membersService.findAll(query, user);
  }
}
