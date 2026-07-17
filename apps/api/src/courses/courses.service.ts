import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  CourseActionResponse,
  CourseListItem,
  CourseListResponse,
  UpdateCourseRequest,
  UpdateCourseResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

type CourseWithDetails = {
  id: string;
  organizationId: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  joinCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacher: {
    id: string;
    name: string | null;
    email: string;
  };
  subject: {
    id: string;
    name: string;
    code: string | null;
  };
  section: {
    id: string;
    name: string;
    gradeLevel: {
      id: string;
      name: string;
    };
  } | null;
  _count: {
    enrollments: number;
    assignments: number;
  };
};

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toCourseListItem(course: CourseWithDetails): CourseListItem {
    return {
      id: course.id,
      organizationId: course.organizationId,
      title: course.title,
      description: course.description,
      status: course.status,
      joinCode: course.joinCode,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      teacher: course.teacher,
      subject: course.subject,
      section: course.section,
      _count: course._count,
    };
  }

  async findCoursesByOrganization(
    organizationId: string,
  ): Promise<CourseListResponse> {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const courses = await this.prisma.course.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        status: true,
        joinCode: true,
        createdAt: true,
        updatedAt: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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
        _count: {
          select: {
            enrollments: true,
            assignments: true,
          },
        },
      },
    });

    this.logger.log(
      `Fetched ${courses.length} courses for organization ${organizationId}.`,
    );

    return {
      organizationId,
      courses: courses.map((course) => this.toCourseListItem(course)),
    };
  }

  async updateCourse(
    organizationId: string,
    courseId: string,
    payload: UpdateCourseRequest,
  ): Promise<UpdateCourseResponse> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const updatedCourse = await this.prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description }
          : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        status: true,
        joinCode: true,
        createdAt: true,
        updatedAt: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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
        _count: {
          select: {
            enrollments: true,
            assignments: true,
          },
        },
      },
    });

    this.logger.log(`Updated course ${courseId}.`);

    return this.toCourseListItem(updatedCourse);
  }

  async deleteCourse(
    organizationId: string,
    courseId: string,
  ): Promise<CourseActionResponse> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    this.logger.log(`Deleted course ${courseId}.`);

    return {
      id: courseId,
    };
  }
}
