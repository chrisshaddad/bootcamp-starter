import { join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { readFile, unlink, rename } from 'fs/promises';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiCookieAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators';
import { AccountType, type User } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { detectImageExtension } from '../auth/utils/detect-image-signature';
import {
  createProjectRequestSchema,
  importGithubProjectRequestSchema,
  updateProjectRequestSchema,
  projectMediaUploadSchema,
  projectMediaUpdateSchema,
  projectsExploreQuerySchema,
  projectBySlugResponseSchema,
  type CreateProjectRequest,
  type ImportGithubProjectRequest,
  type ImportGithubProjectResponse,
  type UpdateProjectRequest,
  type ProjectResponse,
  type ProjectMediaUploadRequest,
  type ProjectMediaUpdateRequest,
  type ProjectByIdResponse,
  type ProjectBySlugResponse,
  type ProjectsExploreQuery,
  type ExploreProjectsResponse,
} from '@repo/contracts';
import { importGithubProjectRequestSchema as importGithubProjectOpenApiRequestSchema } from '../common/swagger/schemas';

const PROJECT_MEDIA_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const PROJECT_MEDIA_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const PROJECT_MEDIA_DIR = join(process.cwd(), 'uploads', 'project-media');

if (!existsSync(PROJECT_MEDIA_DIR)) {
  mkdirSync(PROJECT_MEDIA_DIR, { recursive: true });
}

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(private readonly projectsService: ProjectsService) {}

  @Post('import-github')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Import a public GitHub repository as a project' })
  @ApiBody({ schema: importGithubProjectOpenApiRequestSchema })
  @ApiResponse({
    status: 201,
    description: 'GitHub repository imported as an unverified draft project.',
  })
  @ApiResponse({ status: 400, description: 'Invalid import request.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid session.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({
    status: 404,
    description: 'Repository not found, private, or inaccessible.',
  })
  @ApiResponse({
    status: 409,
    description: 'The repository already has a project.',
  })
  @ApiResponse({
    status: 503,
    description: 'GitHub API unavailable or rate limited.',
  })
  async importGithubProject(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(importGithubProjectRequestSchema))
    body: ImportGithubProjectRequest,
  ): Promise<ImportGithubProjectResponse> {
    return this.projectsService.importGithubProject(userId, body);
  }

  @Get()
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get list of projects owned by the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of projects successfully retrieved.',
  })
  async getMyProjects(
    @CurrentUser() user: User,
  ): Promise<ProjectByIdResponse[]> {
    const projects = await this.projectsService.getMyProjects(user);

    return projects.map((project) => {
      const { repository, ...projectFields } = project;

      return {
        ...projectFields,
        repositoryUrl: repository.htmlUrl,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        publishedAt: project.publishedAt?.toISOString() ?? null,
        media: project.media.map((m) => ({
          id: m.id,
          projectId: m.projectId,
          uploadedByUserId: m.uploadedByUserId,
          mediaType: m.mediaType as 'IMAGE' | 'GIF' | 'ARCHITECTURE_DIAGRAM',
          storageKey: m.storageKey,
          publicUrl: m.publicUrl,
          caption: m.caption,
          sortOrder: m.sortOrder,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        technologies: project.technologies.map((pt) => ({
          id: pt.id,
          projectId: pt.projectId,
          technologyId: pt.technologyId,
          technology: pt.technology,
          source: pt.source,
          evidence: pt.evidence,
          isPrimary: pt.isPrimary,
          sortOrder: pt.sortOrder,
          createdAt: pt.createdAt.toISOString(),
          updatedAt: pt.updatedAt.toISOString(),
        })),
      };
    });
  }

  @Get('explore')
  @Public()
  @ApiOperation({
    summary: 'Explore public published projects with search and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated public projects list successfully retrieved.',
  })
  async exploreProjects(
    @Query(new ZodValidationPipe(projectsExploreQuerySchema))
    query: ProjectsExploreQuery,
  ): Promise<ExploreProjectsResponse> {
    const result = await this.projectsService.exploreProjects(query);

    return {
      data: result.data.map((project) => ({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        publishedAt: project.publishedAt?.toISOString() ?? null,
      })),
      meta: result.meta,
    };
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
  ): Promise<ProjectByIdResponse> {
    const project = await this.projectsService.getProjectById(user, projectId);
    const { repository, ...projectFields } = project;

    return {
      ...projectFields,
      repositoryUrl: repository.htmlUrl,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
      media: (project.media ?? []).map((m) => ({
        id: m.id,
        projectId: m.projectId,
        uploadedByUserId: m.uploadedByUserId,
        mediaType: m.mediaType as 'IMAGE' | 'GIF' | 'ARCHITECTURE_DIAGRAM',
        storageKey: m.storageKey,
        publicUrl: m.publicUrl,
        caption: m.caption,
        sortOrder: m.sortOrder,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      technologies: (project.technologies ?? []).map((pt) => ({
        id: pt.id,
        projectId: pt.projectId,
        technologyId: pt.technologyId,
        technology: pt.technology,
        source: pt.source,
        evidence: pt.evidence,
        isPrimary: pt.isPrimary,
        sortOrder: pt.sortOrder,
        createdAt: pt.createdAt.toISOString(),
        updatedAt: pt.updatedAt.toISOString(),
      })),
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

  @Post(':id/logo')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload a logo/profile picture for a project' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo successfully uploaded.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PROJECT_MEDIA_DIR,
        filename: (_req, _file, callback) =>
          callback(null, `logo-${randomUUID()}`),
      }),
      limits: { fileSize: PROJECT_MEDIA_MAX_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!PROJECT_MEDIA_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, WEBP, or GIF images are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadProjectLogo(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(file.path);
    } catch (_readError) {
      try {
        await unlink(file.path);
      } catch (_unlinkError) {
        // Ignored
      }
      throw new BadRequestException('Could not read the uploaded file');
    }

    const extension = detectImageExtension(fileBuffer);
    if (!extension) {
      try {
        await unlink(file.path);
      } catch (_unlinkError) {
        // Ignored
      }
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const finalFilename = `${file.filename}${extension}`;
    try {
      await rename(file.path, join(PROJECT_MEDIA_DIR, finalFilename));
    } catch (_renameError) {
      try {
        await unlink(file.path);
      } catch (_unlinkError) {
        // Ignored
      }
      throw new BadRequestException('Failed to process the uploaded file');
    }

    const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
    const publicUrl = `${apiUrl}/uploads/project-media/${finalFilename}`;

    try {
      const result = await this.projectsService.uploadLogo(
        user,
        projectId,
        publicUrl,
      );
      const { previousLogoKey, ...project } = result;

      // Unlink safely using the server-extracted storage key
      if (previousLogoKey) {
        try {
          await unlink(join(PROJECT_MEDIA_DIR, previousLogoKey));
        } catch (_unlinkError) {
          // Ignored
        }
      }

      return {
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        publishedAt: project.publishedAt?.toISOString() ?? null,
      };
    } catch (error) {
      try {
        await unlink(join(PROJECT_MEDIA_DIR, finalFilename));
      } catch (_unlinkError) {
        // Ignored
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a project and all of its media' })
  @ApiResponse({ status: 200, description: 'Project successfully deleted.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if the user does not own the project.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async deleteProject(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
  ) {
    const { mediaStorageKeys } = await this.projectsService.deleteProject(
      user,
      projectId,
    );

    await Promise.all(
      mediaStorageKeys.map(async (storageKey) => {
        try {
          await unlink(join(PROJECT_MEDIA_DIR, storageKey));
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== 'ENOENT') {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Failed to delete media file ${storageKey} for removed project ${projectId}: ${message}`,
            );
          }
        }
      }),
    );

    return { success: true };
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
  ): Promise<ProjectBySlugResponse> {
    const project = await this.projectsService.getProjectBySlug(slug);

    const result = {
      id: project.id,
      repositoryId: project.repositoryId,
      repositoryUrl: project.repository.htmlUrl,
      createdByUserId: project.createdByUserId,
      title: project.title,
      slug: project.slug,
      logoUrl: project.logoUrl,
      shortDescription: project.shortDescription,
      fullDescription: project.fullDescription,
      deploymentUrl: project.deploymentUrl,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
      media: (project.media ?? []).map((m) => ({
        id: m.id,
        projectId: m.projectId,
        mediaType: m.mediaType as 'IMAGE' | 'GIF' | 'ARCHITECTURE_DIAGRAM',
        publicUrl: m.publicUrl,
        caption: m.caption,
        sortOrder: m.sortOrder,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      technologies: (project.technologies ?? []).map((pt) => ({
        id: pt.id,
        projectId: pt.projectId,
        technologyId: pt.technologyId,
        technology: pt.technology,
        source: pt.source,
        evidence: pt.evidence,
        isPrimary: pt.isPrimary,
        sortOrder: pt.sortOrder,
        createdAt: pt.createdAt.toISOString(),
        updatedAt: pt.updatedAt.toISOString(),
      })),
    };

    return projectBySlugResponseSchema.parse(result);
  }

  @Post(':id/media')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        mediaType: {
          type: 'string',
          enum: ['IMAGE', 'GIF', 'ARCHITECTURE_DIAGRAM'],
          default: 'IMAGE',
        },
        caption: {
          type: 'string',
        },
        sortOrder: {
          type: 'integer',
          default: 0,
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload media for a project' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Media successfully uploaded.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PROJECT_MEDIA_DIR,
        filename: (_req, _file, callback) => callback(null, randomUUID()),
      }),
      limits: { fileSize: PROJECT_MEDIA_MAX_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!PROJECT_MEDIA_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, WEBP, or GIF images are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadProjectMedia(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(projectMediaUploadSchema))
    body: ProjectMediaUploadRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(file.path);
    } catch (_readError) {
      throw new BadRequestException('Could not read the uploaded file');
    }

    const extension = detectImageExtension(fileBuffer);
    if (!extension) {
      try {
        await unlink(file.path);
      } catch (_unlinkError) {
        // Ignored
      }
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const finalFilename = `${file.filename}${extension}`;
    try {
      await rename(file.path, join(PROJECT_MEDIA_DIR, finalFilename));
    } catch (_renameError) {
      try {
        await unlink(file.path);
      } catch (_unlinkError) {
        // Ignored
      }
      throw new BadRequestException('Failed to process the uploaded file');
    }

    const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
    const publicUrl = `${apiUrl}/uploads/project-media/${finalFilename}`;

    const media = await this.projectsService.addMedia(user, projectId, {
      ...body,
      storageKey: finalFilename,
      publicUrl,
    });

    return {
      ...media,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }

  @Patch(':id/media/:mediaId')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update media details (caption, order)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        caption: {
          type: 'string',
          nullable: true,
        },
        sortOrder: {
          type: 'integer',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Media successfully updated.' })
  async updateProjectMedia(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @Param('mediaId') mediaId: string,
    @Body(new ZodValidationPipe(projectMediaUpdateSchema))
    body: ProjectMediaUpdateRequest,
  ) {
    const media = await this.projectsService.updateMedia(
      user,
      projectId,
      mediaId,
      body,
    );
    return {
      ...media,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }

  @Patch(':id/media/:mediaId/set-cover')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Atomically set a media item as the project cover (sortOrder 0)',
  })
  @ApiResponse({ status: 200, description: 'Cover media successfully set.' })
  async setCoverProjectMedia(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @Param('mediaId') mediaId: string,
  ) {
    const media = await this.projectsService.setCoverMedia(
      user,
      projectId,
      mediaId,
    );
    return {
      ...media,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }

  @Delete(':id/media/:mediaId')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete media from a project' })
  @ApiResponse({ status: 200, description: 'Media successfully deleted.' })
  async deleteProjectMedia(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @Param('mediaId') mediaId: string,
  ) {
    const result = await this.projectsService.deleteMedia(
      user,
      projectId,
      mediaId,
    );

    try {
      await unlink(join(PROJECT_MEDIA_DIR, result.storageKey));
    } catch (_e) {
      // Ignore error if file is already missing from disk
    }

    return { success: true };
  }
}
