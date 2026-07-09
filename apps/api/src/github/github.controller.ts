import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  githubRepositoryPreviewRequestSchema,
  type GithubRepositoryPreviewRequest,
  type GithubRepositoryPreviewResponse,
} from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { githubRepositoryPreviewRequestSchema as githubRepositoryPreviewOpenApiRequestSchema } from '../common/swagger/schemas';
import { GithubService } from './github.service';

@ApiTags('github')
@ApiCookieAuth('session')
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

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
}
