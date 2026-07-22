import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  githubRepositoryPreviewRequestSchema,
  type GithubRepositoryAnalysisPreviewResponse,
  type GithubRepositoryPreviewRequest,
  type GithubRepositoryPreviewResponse,
  type SuccessResponse,
} from '@repo/contracts';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { githubRepositoryPreviewRequestSchema as githubRepositoryPreviewOpenApiRequestSchema } from '../common/swagger/schemas';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';
import { GithubService } from './github.service';

@ApiTags('github')
@ApiCookieAuth('session')
@Controller('github')
export class GithubController {
  constructor(
    private readonly githubService: GithubService,
    private readonly githubRepositorySnapshotService: GithubRepositorySnapshotService,
  ) {}

  @Get('connect')
  @Roles('DEVELOPER', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Starts the GitHub OAuth connection flow',
  })
  async connectGithub(@CurrentUser('id') userId: string, @Res() res: Response) {
    const authorizationUrl =
      await this.githubService.getOAuthConnectUrl(userId);
    return res.redirect(authorizationUrl);
  }

  @Get('callback')
  @Roles('DEVELOPER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Handles GitHub OAuth callback' })
  async githubCallback(
    @CurrentUser('id') userId: string,
    @Query('code') code: string,
    @Query('state') state: string, // 1. Added @Query('state') extraction
    @Res() res: Response,
  ) {
    // 2. Passed the state as the 3rd argument
    await this.githubService.handleOAuthCallback(userId, code, state);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return res.redirect(`${appUrl}/projects/new`);
  }
  @Post('disconnect')
  @Roles('DEVELOPER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Disconnects the linked GitHub account' })
  @ApiResponse({ status: 200, description: 'GitHub account disconnected' })
  @HttpCode(HttpStatus.OK)
  async disconnectGithub(
    @CurrentUser('id') userId: string,
  ): Promise<SuccessResponse> {
    await this.githubService.disconnectGithub(userId);
    return { success: true };
  }

  @Get('my-repositories')
  @Roles('DEVELOPER', 'SUPER_ADMIN')
  @ApiOperation({
    summary: "Fetches the authenticated user's GitHub repositories",
  })
  @ApiResponse({ status: 200, description: 'List of GitHub repositories' })
  async getMyRepositories(@CurrentUser('id') userId: string) {
    return this.githubService.getUserRepositories(userId);
  }

  @Post('repositories/preview')
  @Roles('DEVELOPER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Preview a GitHub repository before import' })
  @ApiBody({ schema: githubRepositoryPreviewOpenApiRequestSchema })
  @ApiResponse({
    status: 200,
    description: 'GitHub repository preview',
  })
  @ApiResponse({ status: 400, description: 'Invalid GitHub repository URL' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Repository not found, private, or inaccessible.',
  })
  @HttpCode(HttpStatus.OK)
  async previewRepository(
    @Body(new ZodValidationPipe(githubRepositoryPreviewRequestSchema))
    body: GithubRepositoryPreviewRequest,
  ): Promise<GithubRepositoryPreviewResponse> {
    return this.githubService.previewRepository(body.repositoryUrl);
  }

  @Post('repositories/analysis-preview')
  @Roles('DEVELOPER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Preview GitHub repository analysis before import' })
  @ApiBody({ schema: githubRepositoryPreviewOpenApiRequestSchema })
  @ApiResponse({
    status: 200,
    description: 'GitHub repository analysis preview',
  })
  @ApiResponse({ status: 400, description: 'Invalid GitHub repository URL' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Repository not found, private, or inaccessible.',
  })
  @ApiResponse({
    status: 503,
    description: 'GitHub API unavailable or rate limited',
  })
  @HttpCode(HttpStatus.OK)
  async previewRepositoryAnalysis(
    @Body(new ZodValidationPipe(githubRepositoryPreviewRequestSchema))
    body: GithubRepositoryPreviewRequest,
  ): Promise<GithubRepositoryAnalysisPreviewResponse> {
    return this.githubRepositorySnapshotService.previewRepositoryAnalysis(
      body.repositoryUrl,
    );
  }
}
