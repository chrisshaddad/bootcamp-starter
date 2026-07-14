import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  type CreateProjectRequest,
  type ImportGithubProjectRequest,
  type ImportGithubProjectResponse,
  type UpdateProjectRequest,
  type ProjectMediaUploadRequest,
  type ProjectMediaUpdateRequest,
  type ProjectsExploreQuery,
} from '@repo/contracts';
import {
  ProjectStatus,
  ProjectRoleKey,
  VerificationStatus,
  AccountType,
  User,
  Prisma,
  MediaType,
  ProjectTechnologySource,
  RepositoryVisibility,
  TechnologyCategory,
} from '@repo/db';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';

const GITHUB_API_UNAVAILABLE_MESSAGE =
  'GitHub API is currently unavailable. Please try again later.';
const REPOSITORY_PROJECT_CONFLICT_MESSAGE =
  'This repository is already linked to a project.';
const PROJECT_SLUG_CONFLICT_MESSAGE =
  'A project with this slug already exists.';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubRepositorySnapshotService: GithubRepositorySnapshotService,
  ) {}

  private mapStatus(
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ): ProjectStatus | undefined {
    if (!status) return undefined;
    return status as ProjectStatus;
  }

  /**
   * Imports a readable public repository as an unverified draft project.
   *
   * A successful scan confirms repository accessibility, not ownership or
   * contribution. Verification remains pending for a separate review flow.
   */
  async importGithubProject(
    userId: string,
    data: ImportGithubProjectRequest,
  ): Promise<ImportGithubProjectResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    const analysis =
      await this.githubRepositorySnapshotService.previewRepositoryAnalysis(
        data.repositoryUrl,
      );

    const githubRepoId = parseGithubRepositoryId(
      analysis.repository.githubRepoId,
    );
    const lastPushedAt = parseNullableGithubDate(
      analysis.repository.lastPushedAt,
    );
    const importedAt = new Date();
    const title = data.title ?? analysis.repository.repoName;

    this.logger.log(
      `Importing GitHub repository ${analysis.repository.fullName} for user ${userId}`,
    );

    try {
      const response = await this.prisma.$transaction(async (tx) => {
        const repository = await tx.repository.upsert({
          where: { githubRepoId },
          create: {
            githubRepoId,
            fullName: analysis.repository.fullName,
            ownerLogin: analysis.repository.ownerLogin,
            repoName: analysis.repository.repoName,
            htmlUrl: analysis.repository.htmlUrl,
            defaultBranch: analysis.repository.defaultBranch,
            visibility: RepositoryVisibility.PUBLIC,
            lastPushedAt,
            lastSyncedAt: importedAt,
          },
          update: {
            fullName: analysis.repository.fullName,
            ownerLogin: analysis.repository.ownerLogin,
            repoName: analysis.repository.repoName,
            htmlUrl: analysis.repository.htmlUrl,
            defaultBranch: analysis.repository.defaultBranch,
            visibility: RepositoryVisibility.PUBLIC,
            lastPushedAt,
            lastSyncedAt: importedAt,
          },
        });

        const existingProject = await tx.project.findUnique({
          where: { repositoryId: repository.id },
          select: { id: true },
        });

        if (existingProject) {
          throw new ConflictException(REPOSITORY_PROJECT_CONFLICT_MESSAGE);
        }

        const slug = await this.generateUniqueProjectSlug(tx, title);

        const project = await tx.project.create({
          data: {
            repositoryId: repository.id,
            createdByUserId: userId,
            title,
            slug,
            shortDescription:
              data.shortDescription === undefined
                ? analysis.repository.description
                : data.shortDescription,
            fullDescription: data.fullDescription ?? null,
            deploymentUrl: data.deploymentUrl ?? null,
            status: ProjectStatus.DRAFT,
            publishedAt: null,
          },
        });

        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId,
            githubUsername: null,
            role: ProjectRoleKey.OWNER,
            verificationStatus: VerificationStatus.PENDING,
            verificationSource: null,
            verifiedAt: null,
            addedByUserId: userId,
          },
        });

        const technologies = await Promise.all(
          analysis.detectedTechnologies.map(
            async (detectedTechnology, sortOrder) => {
              const technology = await tx.technology.upsert({
                where: { slug: detectedTechnology.slug },
                create: {
                  name: detectedTechnology.name,
                  slug: detectedTechnology.slug,
                  category: TechnologyCategory[detectedTechnology.category],
                },
                update: {
                  name: detectedTechnology.name,
                  category: TechnologyCategory[detectedTechnology.category],
                },
              });

              const evidence = joinEvidence(detectedTechnology.evidence);

              await tx.projectTechnology.upsert({
                where: {
                  projectId_technologyId: {
                    projectId: project.id,
                    technologyId: technology.id,
                  },
                },
                create: {
                  projectId: project.id,
                  technologyId: technology.id,
                  source: ProjectTechnologySource.SCANNER,
                  evidence,
                  detectedAt: importedAt,
                  addedByUserId: null,
                  sortOrder,
                },
                update: {
                  source: ProjectTechnologySource.SCANNER,
                  evidence,
                  detectedAt: importedAt,
                  sortOrder,
                },
              });

              return {
                id: technology.id,
                name: technology.name,
                slug: technology.slug,
                category: detectedTechnology.category,
                source: 'SCANNER' as const,
                evidence,
                detectedAt: importedAt.toISOString(),
              };
            },
          ),
        );

        return {
          project: {
            id: project.id,
            title: project.title,
            slug: project.slug,
            status: 'DRAFT' as const,
            shortDescription: project.shortDescription,
            fullDescription: project.fullDescription,
            deploymentUrl: project.deploymentUrl,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
            repository: {
              id: repository.id,
              githubRepoId: repository.githubRepoId.toString(),
              fullName: repository.fullName,
              ownerLogin: repository.ownerLogin,
              repoName: repository.repoName,
              htmlUrl: repository.htmlUrl,
              defaultBranch: repository.defaultBranch,
              visibility: 'PUBLIC' as const,
              lastPushedAt: repository.lastPushedAt?.toISOString() ?? null,
              lastSyncedAt: (
                repository.lastSyncedAt ?? importedAt
              ).toISOString(),
            },
            technologies,
          },
        };
      });

      this.logger.log(
        `Imported GitHub repository ${analysis.repository.fullName} as project ${response.project.id}`,
      );

      return response;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const targetFields = Array.isArray(target)
          ? target.filter((field): field is string => typeof field === 'string')
          : typeof target === 'string'
            ? [target]
            : [];

        if (targetFields.some((field) => field.includes('slug'))) {
          throw new ConflictException(PROJECT_SLUG_CONFLICT_MESSAGE);
        }
        throw new ConflictException(REPOSITORY_PROJECT_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  private async generateUniqueProjectSlug(
    tx: Prisma.TransactionClient,
    title: string,
  ): Promise<string> {
    const baseSlug = slugifyProjectTitle(title);
    const existingProjects = await tx.project.findMany({
      where: {
        OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }],
      },
      select: { slug: true },
    });

    const existingSlugs = new Set(
      existingProjects.map((project) => project.slug),
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;
    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }
    return `${baseSlug}-${suffix}`;
  }

  async getMyProjects(user: User) {
    if (user.accountType === AccountType.SUPER_ADMIN) {
      return this.prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    }

    return this.prisma.project.findMany({
      where: { createdByUserId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getProjectById(user: User, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const isCreator = project.createdByUserId === user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to view this project',
      );
    }

    return project;
  }

  async createProject(userId: string, data: CreateProjectRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { developerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const repository = await this.prisma.repository.findUnique({
      where: { id: data.repositoryId },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    const githubUsername = user.developerProfile?.githubUsername;
    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;

    if (!githubUsername && !isAdmin) {
      throw new ForbiddenException(
        'A connected GitHub account is required to create a project.',
      );
    }

    const isOwner =
      githubUsername?.toLowerCase() === repository.ownerLogin.toLowerCase();

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to create a project for this repository because you do not own it.',
      );
    }

    const existingProject = await this.prisma.project.findFirst({
      where: {
        OR: [{ slug: data.slug }, { repositoryId: data.repositoryId }],
      },
    });

    if (existingProject) {
      if (existingProject.slug === data.slug) {
        throw new ConflictException('A project with this slug already exists.');
      }
      throw new ConflictException(
        'This repository is already linked to a project.',
      );
    }

    const status = this.mapStatus(data.status) ?? ProjectStatus.DRAFT;

    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const newProject = await tx.project.create({
          data: {
            title: data.title,
            slug: data.slug,
            logoUrl: data.logoUrl,
            shortDescription: data.shortDescription,
            fullDescription: data.fullDescription,
            deploymentUrl: data.deploymentUrl,
            repositoryId: data.repositoryId,
            createdByUserId: userId,
            status,
            publishedAt: status === ProjectStatus.PUBLISHED ? new Date() : null,
          },
        });

        await tx.projectMember.create({
          data: {
            projectId: newProject.id,
            userId: user.id,
            githubUsername: githubUsername,
            role: ProjectRoleKey.OWNER,
            verificationStatus: VerificationStatus.VERIFIED,
            addedByUserId: user.id,
          },
        });

        return newProject;
      });

      return project;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        let targetStr = '';
        if (Array.isArray(target)) {
          targetStr = target.map((t) => String(t)).join(', ');
        } else if (typeof target === 'string') {
          targetStr = target;
        }

        if (targetStr.includes('slug')) {
          throw new ConflictException(
            'A project with this slug already exists.',
          );
        }
        if (
          targetStr.includes('repositoryId') ||
          targetStr.includes('repository_id')
        ) {
          throw new ConflictException(
            'This repository is already linked to a project.',
          );
        }

        throw new ConflictException(
          'A project with this slug or repository already exists.',
        );
      }
      throw error;
    }
  }

  async updateProject(
    user: User,
    projectId: string,
    data: UpdateProjectRequest,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const isCreator = project.createdByUserId === user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to edit this project',
      );
    }

    if (data.slug && data.slug !== project.slug) {
      const existingSlug = await this.prisma.project.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new ConflictException('A project with this slug already exists.');
      }
    }

    const newStatus = data.status ? this.mapStatus(data.status) : undefined;

    let publishedAt: Date | null | undefined = undefined;
    if (newStatus === ProjectStatus.PUBLISHED) {
      if (!project.publishedAt) {
        publishedAt = new Date();
      }
    } else if (newStatus) {
      publishedAt = null;
    }

    try {
      return await this.prisma.project.update({
        where: { id: projectId },
        data: {
          title: data.title,
          slug: data.slug,
          logoUrl: data.logoUrl,
          shortDescription: data.shortDescription,
          fullDescription: data.fullDescription,
          deploymentUrl: data.deploymentUrl,
          status: newStatus,
          publishedAt,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'A project with this slug already exists.',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Project not found');
        }
      }
      throw error;
    }
  }

  async uploadLogo(user: User, projectId: string, logoUrl: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const isCreator = project.createdByUserId === user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to edit this project',
      );
    }

    const previousLogoUrl = project.logoUrl;

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: { logoUrl },
    });

    return { ...updatedProject, previousLogoUrl };
  }

  async getProjectBySlug(slug: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      include: {
        media: {
          select: {
            id: true,
            projectId: true,
            mediaType: true,
            publicUrl: true,
            caption: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async exploreProjects(query: ProjectsExploreQuery) {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const where: Prisma.ProjectWhereInput = {
      status: ProjectStatus.PUBLISHED,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              {
                shortDescription: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                fullDescription: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                technologies: {
                  some: {
                    technology: {
                      name: { contains: query.search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    let orderBy: Prisma.ProjectOrderByWithRelationInput = {
      publishedAt: 'desc',
    };
    if (query.sort === 'oldest') {
      orderBy = { publishedAt: 'asc' };
    } else if (query.sort === 'alphabetical') {
      orderBy = { title: 'asc' };
    }

    const [totalItems, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data: projects,
      meta: {
        totalItems,
        currentPage: query.page,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async addMedia(
    user: User,
    projectId: string,
    data: ProjectMediaUploadRequest & { storageKey: string; publicUrl: string },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const isCreator = project.createdByUserId === user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to edit this project',
      );
    }

    return this.prisma.projectMedia.create({
      data: {
        projectId: project.id,
        uploadedByUserId: user.id,
        mediaType: data.mediaType as MediaType,
        storageKey: data.storageKey,
        publicUrl: data.publicUrl,
        caption: data.caption,
        sortOrder: data.sortOrder,
      },
    });
  }

  async updateMedia(
    user: User,
    projectId: string,
    mediaId: string,
    data: ProjectMediaUpdateRequest,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const isCreator = project.createdByUserId === user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to edit this project',
      );
    }

    const media = await this.prisma.projectMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.projectId !== projectId) {
      throw new NotFoundException('Media not found');
    }

    return this.prisma.projectMedia.update({
      where: { id: mediaId },
      data: {
        caption: data.caption !== undefined ? data.caption : undefined,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
      },
    });
  }

  async deleteMedia(user: User, projectId: string, mediaId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const isCreator = project.createdByUserId === user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to edit this project',
      );
    }

    const media = await this.prisma.projectMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.projectId !== projectId) {
      throw new NotFoundException('Media not found');
    }

    await this.prisma.projectMedia.delete({
      where: { id: mediaId },
    });

    return { storageKey: media.storageKey };
  }

  async deleteProject(user: User, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { media: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const isCreator = project.createdByUserId === user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to delete this project',
      );
    }

    await this.prisma.project.delete({ where: { id: projectId } });

    const mediaStorageKeys = project.media.map((m) => m.storageKey);

    if (project.logoUrl) {
      const parts = project.logoUrl.split('/');
      const logoKey = parts[parts.length - 1];
      if (logoKey) {
        mediaStorageKeys.push(logoKey);
      }
    }

    return { mediaStorageKeys };
  }
}

function slugifyProjectTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

function joinEvidence(evidence: string[]): string | null {
  return evidence.length > 0 ? evidence.join('\n') : null;
}

function parseGithubRepositoryId(value: string): bigint {
  try {
    const githubRepoId = BigInt(value);
    if (githubRepoId < 0n) {
      throw new Error('GitHub repository ID cannot be negative');
    }
    return githubRepoId;
  } catch {
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }
}

function parseNullableGithubDate(value: string | Date | null): Date | null {
  if (value === null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }
  return date;
}
