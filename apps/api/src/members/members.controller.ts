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

  /**
   * Lists pending member invitations visible to the current admin.
   */
  @Get('invitations')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findInvitations(
    @Query(new ZodValidationPipe<MemberListQuery>(memberListQuerySchema))
    query: MemberListQuery,
    @CurrentUser() user: User,
  ): Promise<MemberInvitationListResponse> {
    return this.membersService.findInvitations(query, user);
  }

  /**
   * Accepts a public member invitation and sets the session cookie.
   */
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

  /**
   * Sends a new member invitation for the current organization scope.
   */
  @Post('invitations')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async invite(
    @Body(new ZodValidationPipe<MemberInviteRequest>(memberInviteRequestSchema))
    body: MemberInviteRequest,
    @CurrentUser() user: User,
  ): Promise<MemberInvitationActionResponse> {
    return this.membersService.invite(body, user);
  }

  /**
   * Issues a fresh token and email for an existing pending invitation.
   */
  @Post('invitations/:id/resend')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberInvitationActionResponse> {
    return this.membersService.resendInvitation(id, user);
  }

  /**
   * Revokes a pending member invitation in the current organization scope.
   */
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

  /**
   * Creates a Coordly member without creating an auth user.
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async create(
    @Body(new ZodValidationPipe<MemberCreateRequest>(memberCreateRequestSchema))
    body: MemberCreateRequest,
    @CurrentUser() user: User,
  ): Promise<MemberActionResponse> {
    return this.membersService.create(body, user);
  }

  /**
   * Finds one Coordly member in the current organization scope.
   */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberActionResponse> {
    return this.membersService.findOne(id, user);
  }

  /**
   * Updates a Coordly member in the current organization scope.
   */
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

  /**
   * Deletes a Coordly member in the current organization scope.
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MemberActionResponse> {
    return this.membersService.remove(id, user);
  }
}
