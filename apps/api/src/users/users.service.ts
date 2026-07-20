import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CreateUserBody } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

type PrismaKnownError = {
  code: string;
  meta?: {
    target?: unknown;
  };
};

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function isStudentCodeConflict(error: unknown): boolean {
  if (!isPrismaKnownError(error) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.some(
      (field) => typeof field === 'string' && field.includes('studentCode'),
    );
  }

  return typeof target === 'string' && target.includes('studentCode');
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserBody) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const organizationId = input.organizationId.trim();

    if (!name) {
      throw new BadRequestException('Name is required');
    }

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    if (!organizationId) {
      throw new BadRequestException('Organization is required');
    }

    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    try {
      if (input.role === 'MEMBER') {
        return await this.createStudent({
          name,
          email,
          organizationId,
          dateOfBirth: input.dateOfBirth,
          className: input.className,
          sectionName: input.sectionName,
        });
      }

      return await this.createTeacher({
        name,
        email,
        organizationId,
      });
    } catch (error: unknown) {
      if (isPrismaKnownError(error) && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : typeof error.meta?.target === 'string'
            ? error.meta.target
            : 'unique field';

        throw new ConflictException(
          `A record with this ${target} already exists`,
        );
      }

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Failed to create user', errorStack);
      throw error;
    }
  }

  private async createTeacher(input: {
    name: string;
    email: string;
    organizationId: string;
  }) {
    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: 'ORG_ADMIN',
        organizationId: input.organizationId,
        isConfirmed: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });

    this.logger.log(`Created Teacher/Admin user ${user.id}`);

    return {
      message:
        'Teacher/Admin created successfully. They can now log in using magic link.',
      user,
    };
  }

  private async createStudent(input: {
    name: string;
    email: string;
    organizationId: string;
    dateOfBirth?: string;
    className?: string;
    sectionName?: string;
  }) {
    const maxStudentCodeAttempts = 5;
    const className = input.className?.trim();
    const sectionName = input.sectionName?.trim();

    if (!className) {
      throw new BadRequestException('Class / Grade is required for students');
    }

    if (!sectionName) {
      throw new BadRequestException('Section is required for students');
    }

    const dateOfBirth = input.dateOfBirth
      ? new Date(input.dateOfBirth)
      : undefined;

    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      throw new BadRequestException('Invalid date of birth');
    }

    for (let attempt = 1; attempt <= maxStudentCodeAttempts; attempt += 1) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const gradeLevel = await tx.gradeLevel.upsert({
            where: {
              name: className,
            },
            update: {},
            create: {
              name: className,
            },
            select: {
              id: true,
              name: true,
            },
          });

          const section = await tx.section.upsert({
            where: {
              gradeLevelId_name: {
                gradeLevelId: gradeLevel.id,
                name: sectionName,
              },
            },
            update: {},
            create: {
              gradeLevelId: gradeLevel.id,
              name: sectionName,
            },
            select: {
              id: true,
              name: true,
              gradeLevel: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          const user = await tx.user.create({
            data: {
              name: input.name,
              email: input.email,
              role: 'MEMBER',
              organizationId: input.organizationId,
              isConfirmed: true,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              organizationId: true,
              createdAt: true,
            },
          });

          let nextNumber = await tx.studentProfile.count();
          let studentCode = '';

          while (true) {
            nextNumber += 1;
            studentCode = `STU-${nextNumber.toString().padStart(4, '0')}`;

            const existingProfile = await tx.studentProfile.findUnique({
              where: {
                studentCode,
              },
              select: {
                id: true,
              },
            });

            if (!existingProfile) {
              break;
            }
          }

          const studentProfile = await tx.studentProfile.create({
            data: {
              userId: user.id,
              studentCode,
              dateOfBirth,
              sectionId: section.id,
            },
            select: {
              id: true,
              studentCode: true,
              dateOfBirth: true,
              section: {
                select: {
                  id: true,
                  name: true,
                  gradeLevel: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

          return {
            user,
            studentProfile,
          };
        });

        this.logger.log(`Created Student/User ${result.user.id}`);

        return {
          message:
            'Student created successfully. They can now log in using magic link.',
          ...result,
        };
      } catch (error: unknown) {
        if (!isStudentCodeConflict(error)) {
          throw error;
        }

        if (attempt === maxStudentCodeAttempts) {
          throw new ConflictException(
            'Unable to generate a unique student code. Please try again.',
          );
        }

        this.logger.warn(
          `Student code conflict. Retrying creation (${attempt}/${maxStudentCodeAttempts}).`,
        );
      }
    }

    throw new ConflictException(
      'Unable to generate a unique student code. Please try again.',
    );
  }
}
