import { randomUUID } from 'crypto';
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
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
  projectsListQuerySchema,
  projectsListResponseSchema,
  projectBySlugResponseSchema,
  projectByIdResponseSchema,
  projectResponseSchema,
  projectMediaResponseSchema,
  successResponseSchema,
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
  type ProjectsListQuery,
  type ProjectsListResponse,
  type SuccessResponse,
} from '@repo/contracts';
import {
  importGithubProjectRequestSchema as importGithubProjectOpenApiRequestSchema,
  projectByIdResponseSchema as projectByIdOpenApiResponseSchema,
  projectsListResponseSchema as projectsListOpenApiResponseSchema,
  updateProjectRequestSchema as updateProjectOpenApiRequestSchema,
} from '../common/swagger/schemas';
import { mapProjectMember } from './project-member.mapper';
import { ObjectStorageService } from '../storage/storage.service';
import { imageContentType } from '../auth/utils/image-content-type';
import { normalizeMediaUrl } from '../common/utils/normalize-media-url';

const PROJECT_MEDIA_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const PROJECT_MEDIA_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ANONYMOUS_CONTRIBUTOR_NAME = 'Community member';

@ApiTags('projects')
@ApiCookieAuth('session')
@Controller('projects')
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  @Post('import-github')
  @Roles(AccountType.DEVELOPER)
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Import a public GitHub repository as a project' })
  @ApiBody({ schema: importGithubProjectOpenApiRequestSchema })
  @ApiResponse({
    status: 201,
    description:
      'GitHub repository imported as an owner-verified draft project.',
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
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Get owned and accepted collaboration projects' })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['ALL', 'OWNED', 'COLLABORATIONS'],
    description: 'Project ownership scope. Defaults to ALL.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of projects successfully retrieved.',
    schema: projectsListOpenApiResponseSchema,
  })
  async getMyProjects(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(projectsListQuerySchema))
    query: ProjectsListQuery,
  ): Promise<ProjectsListResponse> {
    const result = await this.projectsService.getMyProjects(user, query);

    return projectsListResponseSchema.parse({
      data: result.data.map((project) => {
        const { repository, ...projectFields } = project;

        return projectByIdResponseSchema.parse({
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
          members: project.members.map(mapProjectMember),
        });
      }),
      meta: result.meta,
    });
  }

  @Get('explore')
  @Public()
  @ApiOperation({
    summary: 'Explore public published projects with search and pagination',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated public projects. Multiple technology values match every selected technology.',
  })
  async exploreProjects(
    @Query(new ZodValidationPipe(projectsExploreQuerySchema))
    query: ProjectsExploreQuery,
  ): Promise<ExploreProjectsResponse> {
    const result = await this.projectsService.exploreProjects(query);

    return {
      data: result.data.map((project) => ({
        id: project.id,
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
        repositoryUrl: project.repository?.htmlUrl ?? null,
        media: project.media.map((m) => ({
          id: m.id,
          projectId: m.projectId,
          mediaType: m.mediaType as 'IMAGE' | 'GIF' | 'ARCHITECTURE_DIAGRAM',
          publicUrl: m.publicUrl,
          caption: m.caption,
          sortOrder: m.sortOrder,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        createdBy: project.createdBy
          ? {
              id: project.createdBy.id,
              displayName:
                project.createdBy.developerProfile?.displayName ??
                ANONYMOUS_CONTRIBUTOR_NAME,
              headline: project.createdBy.developerProfile?.headline ?? null,
              profilePictureUrl: normalizeMediaUrl(
                project.createdBy.developerProfile?.profilePictureUrl,
              ),
              githubUsername:
                project.createdBy.developerProfile?.githubUsername ?? null,
            }
          : null,
        technologies: project.technologies.map((pt) => pt.technology),
        contributors: project.members
          .filter((member) => member.user !== null)
          .map((member) => ({
            id: member.user!.id,
            displayName:
              member.user!.developerProfile?.displayName ??
              ANONYMOUS_CONTRIBUTOR_NAME,
            profilePictureUrl: normalizeMediaUrl(
              member.user!.developerProfile?.profilePictureUrl,
            ),
          })),
        contributorCount: project._count.members,
      })),
      meta: result.meta,
    };
  }

  @Get('id/:id')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get a single project by ID for prefilling edit forms',
  })
  @ApiResponse({
    status: 200,
    description: 'Project successfully retrieved.',
    schema: projectByIdOpenApiResponseSchema,
  })
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

    return projectByIdResponseSchema.parse({
      ...projectFields,
      access: project.access,
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
      members: (project.members ?? []).map(mapProjectMember),
    });
  }

  @Post()
  @Roles(AccountType.DEVELOPER)
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

    return projectResponseSchema.parse({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    });
  }

  @Patch(':id')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an existing project' })
  @ApiBody({ schema: updateProjectOpenApiRequestSchema })
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

    return projectResponseSchema.parse({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    });
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
      storage: memoryStorage(),
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

    const extension = detectImageExtension(file.buffer);
    if (!extension) {
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const stored = await this.objectStorage.upload(
      `project-media/${projectId}/logos/${randomUUID()}${extension}`,
      file.buffer,
      imageContentType(extension),
    );

    let result: Awaited<ReturnType<ProjectsService['uploadLogo']>>;
    try {
      result = await this.projectsService.uploadLogo(
        user,
        projectId,
        stored.publicUrl,
      );
    } catch (error) {
      await this.deleteObjectSafely(stored.key, 'rolled-back project logo');
      throw error;
    }

    const { previousLogoUrl, ...project } = result;
    const response = projectResponseSchema.parse({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    });

    // Only remove the old logo after the persisted replacement is confirmed to
    // satisfy the public response contract.
    const previousLogoKey =
      this.objectStorage.keyFromPublicUrl(previousLogoUrl);
    if (previousLogoKey) {
      await this.deleteObjectSafely(previousLogoKey, 'replaced project logo');
    }

    return response;
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
  ): Promise<SuccessResponse> {
    const { mediaStorageKeys, logoUrl } =
      await this.projectsService.deleteProject(user, projectId);

    const logoKey = this.objectStorage.keyFromPublicUrl(logoUrl);
    await this.deleteObjectsSafely(
      logoKey ? [...mediaStorageKeys, logoKey] : mediaStorageKeys,
      `removed project ${projectId}`,
    );

    return successResponseSchema.parse({ success: true });
  }

  @Delete(':id/members/:memberId')
  @Roles(AccountType.DEVELOPER)
  @ApiOperation({ summary: 'Remove a verified member from a project' })
  @ApiResponse({ status: 200, description: 'Project member removed.' })
  @ApiResponse({
    status: 403,
    description: 'Only the project owner may remove members.',
  })
  @ApiResponse({ status: 404, description: 'Project member not found.' })
  async removeProjectMember(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
  ): Promise<SuccessResponse> {
    await this.projectsService.removeProjectMember(user, projectId, memberId);
    return successResponseSchema.parse({ success: true });
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
      members: (project.members ?? []).map(mapProjectMember),
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
      storage: memoryStorage(),
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

    const extension = detectImageExtension(file.buffer);
    if (!extension) {
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const stored = await this.objectStorage.upload(
      `project-media/${projectId}/${randomUUID()}${extension}`,
      file.buffer,
      imageContentType(extension),
    );

    let media: Awaited<ReturnType<ProjectsService['addMedia']>>;
    try {
      media = await this.projectsService.addMedia(user, projectId, {
        ...body,
        storageKey: stored.key,
        publicUrl: stored.publicUrl,
      });
    } catch (error) {
      await this.deleteObjectSafely(stored.key, 'rolled-back project media');
      throw error;
    }

    return projectMediaResponseSchema.parse({
      ...media,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    });
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
    return projectMediaResponseSchema.parse({
      ...media,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    });
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
    return projectMediaResponseSchema.parse({
      ...media,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    });
  }

  @Delete(':id/media/:mediaId')
  @Roles(AccountType.DEVELOPER, AccountType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete media from a project' })
  @ApiResponse({ status: 200, description: 'Media successfully deleted.' })
  async deleteProjectMedia(
    @CurrentUser() user: User,
    @Param('id') projectId: string,
    @Param('mediaId') mediaId: string,
  ): Promise<SuccessResponse> {
    const result = await this.projectsService.deleteMedia(
      user,
      projectId,
      mediaId,
    );

    await this.deleteObjectSafely(result.storageKey, 'removed project media');

    return successResponseSchema.parse({ success: true });
  }

  private async deleteObjectSafely(key: string, context: string) {
    await this.deleteObjectsSafely([key], context);
  }

  private async deleteObjectsSafely(keys: string[], context: string) {
    try {
      await this.objectStorage.deleteMany(keys);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to delete object storage data for ${context}: ${message}`,
      );
    }
  }
}
