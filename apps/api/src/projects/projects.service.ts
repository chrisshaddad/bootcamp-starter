import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from '@repo/contracts';
import {
  ProjectStatus,
  ProjectRoleKey,
  VerificationStatus,
  AccountType,
} from '@repo/db';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapStatus(
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ): ProjectStatus | undefined {
    if (!status) return undefined;
    return ProjectStatus[status];
  }

  async createProject(userId: string, data: CreateProjectRequest) {
    // 1. Fetch the User and their Developer Profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { developerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Check if the provided repositoryId actually exists
    const repository = await this.prisma.repository.findUnique({
      where: { id: data.repositoryId },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    // 3. Verify that the user owns the repository (or is a SUPER_ADMIN)
    const githubUsername = user.developerProfile?.githubUsername;
    const isOwner =
      githubUsername?.toLowerCase() === repository.ownerLogin.toLowerCase();
    const isAdmin = user.accountType === AccountType.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to create a project for this repository because you do not own it.',
      );
    }

    // 4. Ensure a project doesn't already exist for this slug or repository
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

    // 5. Use a transaction to create the Project and the ProjectMember atomically
    const project = await this.prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          title: data.title,
          slug: data.slug,
          shortDescription: data.shortDescription,
          fullDescription: data.fullDescription,
          deploymentUrl: data.deploymentUrl,
          repositoryId: data.repositoryId,
          createdByUserId: userId,
          status: this.mapStatus(data.status) ?? ProjectStatus.DRAFT,
        },
      });

      // Create the ProjectMember entry for the project creator
      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: user.id,
          githubUsername: githubUsername,
          role: ProjectRoleKey.OWNER,
          verificationStatus: VerificationStatus.VERIFIED, // Verified automatically since they created it
          addedByUserId: user.id,
        },
      });

      return newProject;
    });

    return project;
  }

  async updateProject(
    userId: string,
    projectId: string,
    data: UpdateProjectRequest,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.createdByUserId !== userId) {
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

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        title: data.title,
        slug: data.slug,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        deploymentUrl: data.deploymentUrl,
        status: this.mapStatus(data.status),
      },
    });
  }

  async getProjectBySlug(slug: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug },
    });

    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
