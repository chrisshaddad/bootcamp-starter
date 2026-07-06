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
import { Public } from '../auth/decorators'; // <-- 🟢 Import the existing Public decorator
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
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
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
  @Public() // <-- 🟢 Apply the decorator to bypass the global AuthGuard session check
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
