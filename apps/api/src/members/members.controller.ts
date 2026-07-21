import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { MembersService } from './members.service';
import { Roles, CurrentUser, Public } from '../auth/decorators';
import { SESSION_COOKIE_NAME } from '../auth/guards/auth.guard';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  memberCreateRequestSchema,
  memberInvitationAcceptRequestSchema,
  memberInviteRequestSchema,
  memberListQuerySchema,
  memberUpdateRequestSchema,
  type MemberActionResponse,
  type MemberCreateRequest,
  type MemberInvitationAcceptRequest,
  type MemberInvitationAcceptResponse,
  type MemberInvitationActionResponse,
  type MemberInvitationListResponse,
  type MemberInviteRequest,
  type MemberListQuery,
  type MemberListResponse,
  type MemberUpdateRequest,
} from '@repo/contracts';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('invitations')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findInvitations(
    @Query(new ZodValidationPipe<MemberListQuery>(memberListQuerySchema))
    query: MemberListQuery,
    @CurrentUser() user: User,
  ): Promise<MemberInvitationListResponse> {
    return this.membersService.findInvitations(query, user);
  }

  @Post('invitations/accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body(
      new ZodValidationPipe<MemberInvitationAcceptRequest>(
        memberInvitationAcceptRequestSchema,
      ),
    )
    body: MemberInvitationAcceptRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MemberInvitationAcceptResponse> {
    const { sessionId, user } = await this.membersService.acceptInvitation(
      body.token,
    );

    response.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });

    return { user };
  }

  @Post('invitations')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async invite(
    @Body(new ZodValidationPipe<MemberInviteRequest>(memberInviteRequestSchema))
    body: MemberInviteRequest,
    @CurrentUser() user: User,
  ): Promise<MemberInvitationActionResponse> {
    return this.membersService.invite(body, user);
  }

  @Post('invitations/:id/resend')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberInvitationActionResponse> {
    return this.membersService.resendInvitation(id, user);
  }

  @Delete('invitations/:id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberInvitationActionResponse> {
    return this.membersService.revokeInvitation(id, user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findAll(
    @Query(new ZodValidationPipe<MemberListQuery>(memberListQuerySchema))
    query: MemberListQuery,
    @CurrentUser() user: User,
  ): Promise<MemberListResponse> {
    return this.membersService.findAll(query, user);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async create(
    @Body(new ZodValidationPipe<MemberCreateRequest>(memberCreateRequestSchema))
    body: MemberCreateRequest,
    @CurrentUser() user: User,
  ): Promise<MemberActionResponse> {
    return this.membersService.create(body, user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberActionResponse> {
    return this.membersService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe<MemberUpdateRequest>(memberUpdateRequestSchema))
    body: MemberUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<MemberActionResponse> {
    return this.membersService.update(id, body, user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberActionResponse> {
    return this.membersService.remove(id, user);
  }
}
