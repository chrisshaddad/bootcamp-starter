import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get list of projects owned by the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of projects successfully retrieved.',
  })
  async getMyProjects(@CurrentUser() user: User): Promise<ProjectResponse[]> {
    const projects = await this.projectsService.getMyProjects(user);

    return projects.map((project) => ({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    }));
  }

  @Get('id/:id')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get a single project by ID for prefilling edit forms',
  })
  @ApiResponse({ status: 200, description: 'Project successfully retrieved.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if the user does not own the project.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async getProjectById(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
  ): Promise<ProjectResponse> {
    const project = await this.projectsService.getProjectById(user, projectId);

    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    };
  }

  @Post()
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project successfully created.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict if the slug or repository is already linked.',
  })
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
  @ApiOperation({ summary: 'Update an existing project' })
  @ApiResponse({ status: 200, description: 'Project successfully updated.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if the user does not own the project.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict if the updated slug already exists.',
  })
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

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Retrieve a public published project by its slug' })
  @ApiResponse({ status: 200, description: 'Project successfully retrieved.' })
  @ApiResponse({
    status: 404,
    description: 'Project not found or is in DRAFT status.',
  })
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
