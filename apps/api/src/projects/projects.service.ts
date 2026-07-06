import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger, // <-- Added Logger import
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from '@repo/contracts';
import { ProjectStatus } from '@repo/db';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name); // <-- Added Logger initialization

  constructor(private readonly prisma: PrismaService) {}

  // FIX: Safely map the string literal to the Prisma Enum without using "as"
  private mapStatus(
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ): ProjectStatus | undefined {
    if (!status) return undefined;
    return ProjectStatus[status];
  }

  async createProject(userId: string, data: CreateProjectRequest) {
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

    return this.prisma.project.create({
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
      // FIX: Explicitly mapping fields prevents Mass Assignment
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

    // Ensures public requests can only access PUBLISHED projects.
    // Modify or remove this condition if draft/archived projects should also be viewable.
    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
