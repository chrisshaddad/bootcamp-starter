import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/prisma.service';
import { ProjectStatus, Prisma } from '@repo/db';
import type { SavedProjectsListQuery } from '@repo/contracts';

const ANONYMOUS_CONTRIBUTOR_NAME = 'Community member';
const PROJECT_NOT_FOUND_MESSAGE = 'Project not found.';

const exploreProjectSelect = {
  id: true,
  title: true,
  slug: true,
  logoUrl: true,
  shortDescription: true,
  fullDescription: true,
  deploymentUrl: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  media: {
    orderBy: { sortOrder: 'asc' as const },
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
  },
  repository: {
    select: { htmlUrl: true },
  },
  createdBy: {
    select: {
      id: true,
      developerProfile: {
        select: {
          displayName: true,
          headline: true,
          profilePictureUrl: true,
          githubUsername: true,
        },
      },
    },
  },
  technologies: {
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    select: {
      technology: {
        select: { id: true, name: true, slug: true, category: true },
      },
    },
  },
  members: {
    where: { user: { isNot: null } },
    take: 4,
    orderBy: { createdAt: 'asc' as const },
    select: {
      user: {
        select: {
          id: true,
          developerProfile: {
            select: { displayName: true, profilePictureUrl: true },
          },
        },
      },
    },
  },
  _count: {
    select: { members: true },
  },
} satisfies Prisma.ProjectSelect;

function toExploreProjectResponse(
  project: Prisma.ProjectGetPayload<{ select: typeof exploreProjectSelect }>,
) {
  return {
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
          profilePictureUrl:
            project.createdBy.developerProfile?.profilePictureUrl ?? null,
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
        profilePictureUrl:
          member.user!.developerProfile?.profilePictureUrl ?? null,
      })),
    contributorCount: project._count.members,
  };
}

@Injectable()
export class SavedProjectsService {
  constructor(private readonly db: DatabaseService) {}

  async saveProject(userId: string, projectId: string, note?: string) {
    const project = await this.db.project.findFirst({
      where: { id: projectId, status: ProjectStatus.PUBLISHED },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_NOT_FOUND_MESSAGE);
    }

    try {
      const saved = await this.db.savedProject.create({
        data: { savedByUserId: userId, projectId, note },
      });

      return saved;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Already saved — treat as idempotent rather than erroring.
        const existing = await this.db.savedProject.findUnique({
          where: {
            savedByUserId_projectId: { savedByUserId: userId, projectId },
          },
        });
        if (existing) {
          return existing;
        }
        throw new ConflictException('Project is already saved.');
      }
      throw error;
    }
  }

  async unsaveProject(userId: string, projectId: string) {
    await this.db.savedProject.deleteMany({
      where: { savedByUserId: userId, projectId },
    });
  }

  async updateNote(userId: string, projectId: string, note: string | null) {
    try {
      return await this.db.savedProject.update({
        where: {
          savedByUserId_projectId: { savedByUserId: userId, projectId },
        },
        data: { note },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Saved project not found.');
      }
      throw error;
    }
  }

  async listSavedProjectIds(userId: string): Promise<string[]> {
    const savedProjects = await this.db.savedProject.findMany({
      where: { savedByUserId: userId },
      select: { projectId: true },
    });

    return savedProjects.map((sp) => sp.projectId);
  }

  async listSavedProjects(userId: string, query: SavedProjectsListQuery) {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const where: Prisma.SavedProjectWhereInput = { savedByUserId: userId };

    const [totalItems, savedProjects] = await Promise.all([
      this.db.savedProject.count({ where }),
      this.db.savedProject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          createdAt: true,
          note: true,
          project: { select: exploreProjectSelect },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data: savedProjects.map((sp) => ({
        ...toExploreProjectResponse(sp.project),
        savedAt: sp.createdAt.toISOString(),
        note: sp.note,
      })),
      meta: {
        totalItems,
        currentPage: query.page,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }
}
