import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  createProjectInvitationRequestSchema,
  projectCollaboratorSearchQuerySchema,
  projectInvitationListQuerySchema,
  uuidSchema,
  type AcceptProjectInvitationResponse,
  type CancelProjectInvitationResponse,
  type CreateProjectInvitationRequest,
  type DeclineProjectInvitationResponse,
  type ProjectCollaboratorSearchQuery,
  type ProjectCollaboratorSearchResponse,
  type ProjectInvitationListQuery,
  type ProjectInvitationListResponse,
  type ProjectInvitationPendingCountResponse,
  type ProjectInvitationResponse,
} from '@repo/contracts';
import { AccountType, type User } from '@repo/db';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import {
  createProjectInvitationRequestSchema as createProjectInvitationOpenApiRequestSchema,
  projectCollaboratorSearchResponseSchema as projectCollaboratorSearchOpenApiResponseSchema,
  projectInvitationListResponseSchema as projectInvitationListOpenApiResponseSchema,
  projectInvitationPendingCountResponseSchema as projectInvitationPendingCountOpenApiResponseSchema,
  projectInvitationResponseSchema as projectInvitationOpenApiResponseSchema,
} from '../common/swagger/schemas';
import { ProjectInvitationsService } from './project-invitations.service';

@ApiTags('project invitations')
@ApiCookieAuth('session')
@Roles(AccountType.DEVELOPER)
@Controller()
export class ProjectInvitationsController {
  constructor(
    private readonly projectInvitationsService: ProjectInvitationsService,
  ) {}

  @Get('projects/:projectId/collaborators/search')
  @ApiOperation({
    summary: 'Validate an exact GitHub collaborator and platform account',
  })
  @ApiQuery({ name: 'githubUsername', type: String, required: true })
  @ApiResponse({
    status: 200,
    description: 'Verified collaborator available for invitation.',
    schema: projectCollaboratorSearchOpenApiResponseSchema,
  })
  @ApiResponse({ status: 403, description: 'Caller is not the project owner.' })
  @ApiResponse({
    status: 404,
    description: 'GitHub collaborator or connected platform account not found.',
  })
  @ApiResponse({ status: 409, description: 'Member or invitation exists.' })
  @ApiResponse({ status: 429, description: 'Collaborator lookup rate limit.' })
  @ApiResponse({ status: 503, description: 'GitHub is unavailable.' })
  searchCollaborator(
    @CurrentUser() user: User,
    @Param('projectId', new ZodValidationPipe(uuidSchema)) projectId: string,
    @Query(new ZodValidationPipe(projectCollaboratorSearchQuerySchema))
    query: ProjectCollaboratorSearchQuery,
  ): Promise<ProjectCollaboratorSearchResponse> {
    return this.projectInvitationsService.searchCollaborator(
      user,
      projectId,
      query.githubUsername,
    );
  }

  @Post('projects/:projectId/invitations')
  @ApiOperation({ summary: 'Invite a verified GitHub repository collaborator' })
  @ApiBody({ schema: createProjectInvitationOpenApiRequestSchema })
  @ApiResponse({
    status: 201,
    description: 'Invitation created.',
    schema: projectInvitationOpenApiResponseSchema,
  })
  @ApiResponse({ status: 403, description: 'Caller is not the project owner.' })
  @ApiResponse({ status: 404, description: 'Collaborator account not found.' })
  @ApiResponse({ status: 409, description: 'Member or invitation exists.' })
  @ApiResponse({ status: 429, description: 'Invitation creation rate limit.' })
  @ApiResponse({ status: 503, description: 'GitHub is unavailable.' })
  createInvitation(
    @CurrentUser() user: User,
    @Param('projectId', new ZodValidationPipe(uuidSchema)) projectId: string,
    @Body(new ZodValidationPipe(createProjectInvitationRequestSchema))
    body: CreateProjectInvitationRequest,
  ): Promise<ProjectInvitationResponse> {
    return this.projectInvitationsService.createInvitation(
      user,
      projectId,
      body,
    );
  }

  @Get('projects/:projectId/invitations')
  @ApiOperation({ summary: 'List project invitations for the owner' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Project invitation history.',
    schema: projectInvitationListOpenApiResponseSchema,
  })
  listProjectInvitations(
    @CurrentUser() user: User,
    @Param('projectId', new ZodValidationPipe(uuidSchema)) projectId: string,
    @Query(new ZodValidationPipe(projectInvitationListQuerySchema))
    query: ProjectInvitationListQuery,
  ): Promise<ProjectInvitationListResponse> {
    return this.projectInvitationsService.listProjectInvitations(
      user,
      projectId,
      query,
    );
  }

  @Delete('projects/:projectId/invitations/:invitationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending project invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation canceled.',
    schema: projectInvitationOpenApiResponseSchema,
  })
  @ApiResponse({ status: 409, description: 'Invitation is no longer pending.' })
  cancelInvitation(
    @CurrentUser() user: User,
    @Param('projectId', new ZodValidationPipe(uuidSchema)) projectId: string,
    @Param('invitationId', new ZodValidationPipe(uuidSchema))
    invitationId: string,
  ): Promise<CancelProjectInvitationResponse> {
    return this.projectInvitationsService.cancelInvitation(
      user,
      projectId,
      invitationId,
    );
  }

  @Get('project-invitations')
  @ApiOperation({ summary: 'List invitations for the current developer' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Invitation inbox and history.',
    schema: projectInvitationListOpenApiResponseSchema,
  })
  listInbox(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(projectInvitationListQuerySchema))
    query: ProjectInvitationListQuery,
  ): Promise<ProjectInvitationListResponse> {
    return this.projectInvitationsService.listInbox(user, query);
  }

  @Get('project-invitations/pending-count')
  @ApiOperation({ summary: 'Get the current developer pending invite count' })
  @ApiResponse({
    status: 200,
    description: 'Pending invitation count.',
    schema: projectInvitationPendingCountOpenApiResponseSchema,
  })
  getPendingCount(
    @CurrentUser() user: User,
  ): Promise<ProjectInvitationPendingCountResponse> {
    return this.projectInvitationsService.getPendingCount(user);
  }

  @Post('project-invitations/:invitationId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a project invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted and membership created.',
    schema: projectInvitationOpenApiResponseSchema,
  })
  @ApiResponse({
    status: 403,
    description: 'Invitation belongs to another user.',
  })
  @ApiResponse({ status: 409, description: 'Invitation cannot be accepted.' })
  @ApiResponse({ status: 503, description: 'GitHub is unavailable.' })
  acceptInvitation(
    @CurrentUser() user: User,
    @Param('invitationId', new ZodValidationPipe(uuidSchema))
    invitationId: string,
  ): Promise<AcceptProjectInvitationResponse> {
    return this.projectInvitationsService.acceptInvitation(user, invitationId);
  }

  @Post('project-invitations/:invitationId/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline a project invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation declined.',
    schema: projectInvitationOpenApiResponseSchema,
  })
  @ApiResponse({
    status: 403,
    description: 'Invitation belongs to another user.',
  })
  @ApiResponse({ status: 409, description: 'Invitation cannot be declined.' })
  declineInvitation(
    @CurrentUser() user: User,
    @Param('invitationId', new ZodValidationPipe(uuidSchema))
    invitationId: string,
  ): Promise<DeclineProjectInvitationResponse> {
    return this.projectInvitationsService.declineInvitation(user, invitationId);
  }
}
