import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type ProjectMediaUploadRequest,
  type ProjectMediaUpdateRequest,
} from '@repo/contracts';
import {
  ProjectStatus,
  ProjectRoleKey,
  VerificationStatus,
  AccountType,
  User,
  Prisma,
  MediaType,
} from '@repo/db';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStatus(
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ): ProjectStatus | undefined {
    if (!status) return undefined;
    return status as ProjectStatus;
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

    // ProjectMedia/ProjectMember/ProjectTechnology/SavedProject rows cascade
    // on the schema's onDelete: Cascade — only the on-disk media files need
    // manual cleanup, which the controller does with the keys returned here.
    await this.prisma.project.delete({ where: { id: projectId } });

    return { mediaStorageKeys: project.media.map((m) => m.storageKey) };
  }
}
