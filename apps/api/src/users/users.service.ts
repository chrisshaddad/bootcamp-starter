import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UsersExploreQuery, UpdateProfileRequest } from '@repo/contracts';
import { Prisma, OrganizationType } from '@repo/db'; // Import OrganizationType directly

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private getSafeSelect() {
    return {
      id: true,
      accountType: true,
      createdAt: true,
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

  async exploreUsers(query: UsersExploreQuery) {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const where: Prisma.UserWhereInput = {
      isConfirmed: true,
      ...(query.search
        ? {
            OR: [
              {
                developerProfile: {
                  displayName: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                developerProfile: {
                  headline: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                developerProfile: {
                  bio: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                developerProfile: {
                  githubUsername: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                hiringProfile: {
                  organizationName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                hiringProfile: {
                  jobTitle: { contains: query.search, mode: 'insensitive' },
                },
              },
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

    const [totalItems, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: this.getSafeSelect(),
      }),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data: users,
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

  async updateProfile(userId: string, data: UpdateProfileRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { developerProfile: true, hiringProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
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
      } else if (user.accountType === 'HIRING' && user.hiringProfile) {
        await this.prisma.hiringProfile.update({
          where: { id: user.hiringProfile.id },
          data: {
            organizationName: data.organizationName,
            organizationType: data.organizationType as OrganizationType, // Using the direct import
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
