import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators';
import { AccountType, type User } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createProjectRequestSchema,
  updateProjectRequestSchema,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type ProjectResponse,
} from '@repo/contracts';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  async createProject(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createProjectRequestSchema))
    body: CreateProjectRequest,
  ): Promise<ProjectResponse> {
    const project = await this.projectsService.createProject(userId, body);

    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    };
  }

  @Patch(':id')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  async updateProject(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @Body(new ZodValidationPipe(updateProjectRequestSchema))
    body: UpdateProjectRequest,
  ): Promise<ProjectResponse> {
    const project = await this.projectsService.updateProject(
      user,
      projectId,
      body,
    );

    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    };
  }

  @Get(':slug')
  @Public()
  async getProjectBySlug(
    @Param('slug') slug: string,
  ): Promise<ProjectResponse> {
    const project = await this.projectsService.getProjectBySlug(slug);

    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    };
  }
}
