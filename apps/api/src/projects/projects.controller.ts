import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; // <-- Add RolesGuard
import { Roles } from '../auth/decorators/roles.decorator'; // <-- Add Roles Decorator
import { Public } from '../auth/decorators';
import { AccountType } from '@repo/db'; // <-- Import AccountType enum
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
  @UseGuards(AuthGuard, RolesGuard) // <-- Restrict by Guard
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN) // <-- Restrict by Role
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
  @UseGuards(AuthGuard, RolesGuard) // <-- Restrict by Guard
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN) // <-- Restrict by Role
  async updateProject(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body(new ZodValidationPipe(updateProjectRequestSchema))
    body: UpdateProjectRequest,
  ): Promise<ProjectResponse> {
    const project = await this.projectsService.updateProject(
      userId,
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
  @Public() // Still strictly public for GET operations
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
