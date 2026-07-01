import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@repo/database';
import { PrismaService } from '../database/prisma.service';

type CreateUserRole = 'ORG_ADMIN' | 'MEMBER';

interface CreateUserInput {
  name: string;
  email: string;
  role: CreateUserRole;
  dateOfBirth?: string;
  className?: string;
  sectionName?: string;
}

function isEmailUniqueConstraintError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = error.meta?.target;

    return Array.isArray(target)
      ? target.includes('email')
      : typeof target === 'string' && target.includes('email');
  }

  return false;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();

    if (!name) {
      throw new BadRequestException('Name is required');
    }

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    if (!['ORG_ADMIN', 'MEMBER'].includes(input.role)) {
      throw new BadRequestException('Invalid role');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    if (input.role === 'MEMBER') {
      return this.createStudent({
        name,
        email,
        dateOfBirth: input.dateOfBirth,
        className: input.className,
        sectionName: input.sectionName,
      });
    }

    return this.createTeacher({
      name,
      email,
    });
  }

  private async createTeacher(input: { name: string; email: string }) {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: 'ORG_ADMIN',
          isConfirmed: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        message:
          'Teacher/Admin created successfully. They can now log in using magic link.',
        user,
      };
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  private async createStudent(input: {
    name: string;
    email: string;
    dateOfBirth?: string;
    className?: string;
    sectionName?: string;
  }) {
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
        });

        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            role: 'MEMBER',
            isConfirmed: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });

        let nextNumber = await tx.studentProfile.count();
        let studentCode = '';

        while (true) {
          nextNumber += 1;
          studentCode = `STU-${nextNumber.toString().padStart(4, '0')}`;

          const existingProfile = await tx.studentProfile.findUnique({
            where: { studentCode },
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

      return {
        message:
          'Student created successfully. They can now log in using magic link.',
        ...result,
      };
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }
}
