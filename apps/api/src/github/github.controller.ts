import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  githubRepositoryPreviewRequestSchema,
  type GithubRepositoryPreviewRequest,
  type GithubRepositoryPreviewResponse,
} from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post('repositories/preview')
  @Roles('DEVELOPER')
  @HttpCode(HttpStatus.OK)
  async previewRepository(
    @Body(new ZodValidationPipe(githubRepositoryPreviewRequestSchema))
    body: GithubRepositoryPreviewRequest,
  ): Promise<GithubRepositoryPreviewResponse> {
    return this.githubService.previewRepository(body.repositoryUrl);
  }
}
