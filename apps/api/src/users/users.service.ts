import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/prisma.service';
import {
  developerPublicProfileResponseSchema,
  type DeveloperPublicProfileResponse,
  type UsersExploreQuery,
  type UpdateProfileRequest,
} from '@repo/contracts';
import {
  AccountType,
  Prisma,
  OrganizationType,
  ProjectRoleKey,
  ProjectStatus,
  VerificationStatus,
} from '@repo/db';
import { normalizeMediaUrl } from '../common/utils/normalize-media-url';
import { AiService } from '../ai/ai.service';

const MAX_COSINE_DISTANCE = 0.65; // Cosine distance threshold for semantic matches

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly aiService: AiService
  ) {}

  private getSafeSelect() {
    return {
      id: true,
      accountType: true,
      hasSeenDashboardTour: true,
      developerProfile: {
        select: {
          id: true,
          publicSlug: true,
          displayName: true,
          headline: true,
          bio: true,
          location: true,
          profilePictureUrl: true,
          githubUsername: true,
          linkedinUrl: true,
          personalWebsiteUrl: true,
        },
      },
      hiringProfile: {
        select: {
          id: true,
          organizationName: true,
          organizationType: true,
          jobTitle: true,
          linkedinUrl: true,
          organizationWebsiteUrl: true,
        },
      },
    };
  }

  async enhanceProfile(headline: string, bio: string) {
    return this.aiService.enhanceProfile(bio, headline);
  }

  async exploreUsers(query: UsersExploreQuery) {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    
    let userIds: string[] | undefined = undefined;

    // Vector Semantic Search using <=> (Cosine Distance) with threshold 0.65
    if (query.search && query.search.trim().length > 0) {
      const embedding = await this.aiService.generateEmbedding(query.search.trim());
      if (embedding.length > 0) {
        const vectorString = `[${embedding.join(',')}]`;
        const matches = await this.prisma.$queryRaw<{ userId: string }[]>`
          SELECT "userId" FROM "DeveloperProfile"
          WHERE embedding IS NOT NULL
            AND (embedding <=> ${vectorString}::vector) < ${MAX_COSINE_DISTANCE}
          ORDER BY embedding <=> ${vectorString}::vector
          LIMIT ${take} OFFSET ${skip}
        `;
        if (matches.length > 0) {
          userIds = matches.map((m) => m.userId);
        }
      }
    }

    // Fallback to keyword search if vector search didn't yield matches
    const where: Prisma.UserWhereInput = {
      isConfirmed: true,
      ...(userIds ? { id: { in: userIds } } : {}),
      ...(!userIds && query.search
        ? {
            OR: [
              { developerProfile: { displayName: { contains: query.search, mode: 'insensitive' } } },
              { developerProfile: { headline: { contains: query.search, mode: 'insensitive' } } },
              { developerProfile: { bio: { contains: query.search, mode: 'insensitive' } } },
              { developerProfile: { githubUsername: { contains: query.search, mode: 'insensitive' } } },
              { hiringProfile: { organizationName: { contains: query.search, mode: 'insensitive' } } },
              { hiringProfile: { jobTitle: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    let orderBy:
      | Prisma.UserOrderByWithRelationInput
      | Prisma.UserOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'asc' },
    ];

    if (query.sort === 'oldest') {
      orderBy = [{ createdAt: 'asc' }, { id: 'asc' }];
    } else if (query.sort === 'alphabetical') {
      orderBy = [
        { developerProfile: { displayName: 'asc' } },
        { hiringProfile: { organizationName: 'asc' } },
        { id: 'asc' },
      ];
    }

    const prismaSkip = userIds ? 0 : skip;
    const prismaTake = userIds ? userIds.length : take;

    const [totalItems, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: userIds ? undefined : orderBy,
        skip: prismaSkip,
        take: prismaTake,
        select: this.getSafeSelect(),
      }),
    ]);

    const sortedUsers = userIds
      ? userIds.map(id => users.find(u => u.id === id)).filter(Boolean)
      : users;

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data: sortedUsers as typeof users,
      meta: {
        totalItems,
        currentPage: query.page,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.getSafeSelect(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserBySlug(slug: string) {
    const user = await this.prisma.user.findFirst({
      where: { developerProfile: { publicSlug: slug } },
      select: this.getSafeSelect(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getDeveloperPublicProfile(
    slug: string,
  ): Promise<DeveloperPublicProfileResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        accountType: AccountType.DEVELOPER,
        isConfirmed: true,
        developerProfile: { publicSlug: slug },
      },
      select: {
        id: true,
        developerProfile: {
          select: {
            publicSlug: true,
            displayName: true,
            headline: true,
            bio: true,
            location: true,
            profilePictureUrl: true,
            githubUsername: true,
            linkedinUrl: true,
            personalWebsiteUrl: true,
          },
        },
      },
    });

    if (!user?.developerProfile) {
      throw new NotFoundException('Developer profile not found');
    }

    const projects = await this.prisma.project.findMany({
      where: {
        status: ProjectStatus.PUBLISHED,
        OR: [
          { createdByUserId: user.id },
          {
            members: {
              some: {
                userId: user.id,
                verificationStatus: VerificationStatus.VERIFIED,
                role: {
                  in: [ProjectRoleKey.EDITOR, ProjectRoleKey.CONTRIBUTOR],
                },
              },
            },
          },
        ],
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        createdByUserId: true,
        title: true,
        slug: true,
        logoUrl: true,
        shortDescription: true,
        deploymentUrl: true,
        publishedAt: true,
        updatedAt: true,
        members: {
          where: {
            userId: user.id,
            verificationStatus: VerificationStatus.VERIFIED,
          },
          select: { role: true, contributionRoleLabel: true },
          take: 1,
        },
        media: {
          orderBy: { sortOrder: 'asc' },
          select: { publicUrl: true },
          take: 1,
        },
        technologies: {
          orderBy: { sortOrder: 'asc' },
          select: { technology: true },
        },
      },
    });

    const mappedProjects = projects.map((project) => {
      const membership = project.members[0];
      const role =
        project.createdByUserId === user.id
          ? ProjectRoleKey.OWNER
          : (membership?.role ?? ProjectRoleKey.CONTRIBUTOR);

      return {
        id: project.id,
        title: project.title,
        slug: project.slug,
        logoUrl: normalizeOptionalUrl(project.logoUrl),
        shortDescription: project.shortDescription,
        deploymentUrl: normalizeOptionalUrl(project.deploymentUrl),
        publishedAt: project.publishedAt ?? project.updatedAt,
        role,
        contributionRoleLabel: membership?.contributionRoleLabel ?? null,
        coverImageUrl: normalizeOptionalUrl(project.media[0]?.publicUrl),
        technologies: project.technologies.map(({ technology }) => technology),
      };
    });
    const ownedProjects = mappedProjects.filter(
      (project) => project.role === ProjectRoleKey.OWNER,
    ).length;
    const profile = user.developerProfile;

    return developerPublicProfileResponseSchema.parse({
      userId: user.id,
      publicSlug: profile.publicSlug,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      profilePictureUrl: normalizeMediaUrl(profile.profilePictureUrl),
      githubUsername: profile.githubUsername,
      githubUrl: profile.githubUsername
        ? `https://github.com/${profile.githubUsername}`
        : null,
      linkedinUrl: normalizeOptionalUrl(profile.linkedinUrl),
      personalWebsiteUrl: normalizeOptionalUrl(profile.personalWebsiteUrl),
      stats: {
        publishedProjects: mappedProjects.length,
        ownedProjects,
        collaborationProjects: mappedProjects.length - ownedProjects,
      },
      projects: mappedProjects,
    });
  }

  async updateProfile(userId: string, data: UpdateProfileRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { developerProfile: true, hiringProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      if (data.hasSeenDashboardTour !== undefined) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            hasSeenDashboardTour: data.hasSeenDashboardTour,
          },
        });
      }

      if (user.accountType === 'DEVELOPER' && user.developerProfile) {
        await this.prisma.developerProfile.update({
          where: { id: user.developerProfile.id },
          data: {
            displayName: data.displayName,
            publicSlug: data.publicSlug,
            headline: data.headline,
            bio: data.bio,
            location: data.location,
            linkedinUrl: data.linkedinUrl,
            personalWebsiteUrl: data.personalWebsiteUrl,
            profilePictureUrl: data.profilePictureUrl,
          },
        });

        // Update Developer Profile AI Embedding
        const combinedText = `${data.displayName || ''} ${data.headline || ''} ${data.bio || ''} ${data.location || ''}`;
        const embedding = await this.aiService.generateEmbedding(combinedText);
        if (embedding.length > 0) {
          const vectorString = `[${embedding.join(',')}]`;
          await this.prisma.$executeRaw`
            UPDATE "DeveloperProfile"
            SET embedding = ${vectorString}::vector
            WHERE "userId" = ${userId}
          `;
        }

      } else if (user.accountType === 'HIRING' && user.hiringProfile) {
        await this.prisma.hiringProfile.update({
          where: { id: user.hiringProfile.id },
          data: {
            organizationName: data.organizationName,
            organizationType: data.organizationType as OrganizationType,
            jobTitle: data.jobTitle,
            linkedinUrl: data.linkedinUrl,
            organizationWebsiteUrl: data.organizationWebsiteUrl,
          },
        });
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This public slug is already taken. Please choose another one.',
        );
      }
      throw error;
    }

    return this.getUserById(userId);
  }
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}