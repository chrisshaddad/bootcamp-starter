import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTeacherAssignmentRequest,
  DeleteTeacherAssignmentResponse,
  GradeSubmissionRequest,
  GradeSubmissionResponse,
  TeacherAssignmentListResponse,
  TeacherAssignmentResponse,
  TeacherCourseListResponse,
  TeacherSubmissionListResponse,
  UpdateTeacherAssignmentRequest,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class TeacherService {
  private async requireOwnedAssignment(
    teacherId: string,
    organizationId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        type: 'assignment',
        createdById: teacherId,
        course: {
          organizationId,
        },
      },
      select: {
        id: true,
        courseId: true,
        status: true,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} was not found`,
      );
    }

    return assignment;
  }
  private readonly logger = new Logger(TeacherService.name);

  constructor(private readonly prisma: PrismaService) {}
  async findMyCourses(
    teacherId: string,
    organizationId: string | null,
  ): Promise<TeacherCourseListResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    return this.prisma.course.findMany({
      where: {
        teacherId,
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        joinCode: true,
        createdAt: true,
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
  }

  async createAssignment(
    teacherId: string,
    organizationId: string | null,
    input: CreateTeacherAssignmentRequest,
  ): Promise<TeacherAssignmentResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    const course = await this.prisma.course.findFirst({
      where: {
        id: input.courseId,
        organizationId,
      },
      select: {
        id: true,
        title: true,
        teacherId: true,
        organizationId: true,
      },
    });

    if (!course) {
      throw new NotFoundException(
        `Course with ID ${input.courseId} was not found`,
      );
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You cannot create assignments for this course',
      );
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        courseId: course.id,
        createdById: teacherId,
        type: 'assignment',
        title: input.title,
        instructions: input.instructions,
        maxScore: input.maxScore,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        noteToStudents: input.noteToStudents,
        status: input.status,
      },
      select: {
        id: true,
        courseId: true,
        createdById: true,
        type: true,
        title: true,
        instructions: true,
        maxScore: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,
        noteToStudents: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return {
      ...assignment,
      type: 'assignment',
      maxScore: assignment.maxScore.toNumber(),
    };
  }
  async findMyAssignments(
    teacherId: string,
    organizationId: string | null,
  ): Promise<TeacherAssignmentListResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    const assignments = await this.prisma.assignment.findMany({
      where: {
        createdById: teacherId,
        type: 'assignment',
        course: {
          organizationId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        courseId: true,
        createdById: true,
        type: true,
        title: true,
        instructions: true,
        maxScore: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,
        noteToStudents: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    return assignments.map((assignment) => ({
      ...assignment,
      type: 'assignment',
      maxScore: assignment.maxScore.toNumber(),
    }));
  }
  async findAssignmentSubmissions(
    teacherId: string,
    organizationId: string | null,
    assignmentId: string,
  ): Promise<TeacherSubmissionListResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        course: {
          organizationId,
        },
      },
      select: {
        id: true,
        createdById: true,
        type: true,
      },
    });

    if (!assignment || assignment.type !== 'assignment') {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} was not found`,
      );
    }

    if (assignment.createdById !== teacherId) {
      throw new ForbiddenException(
        'You cannot view submissions for this assignment',
      );
    }

    const submissions = await this.prisma.submission.findMany({
      where: {
        assignmentId,
        assignment: {
          course: {
            organizationId,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        contentText: true,
        fileUrl: true,
        answers: true,
        teacherNote: true,
        submittedAt: true,
        status: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        grade: {
          select: {
            id: true,
            score: true,
            feedbackText: true,
            gradedAt: true,
          },
        },
      },
    });

    return submissions.map((submission) => ({
      ...submission,
      submittedAt: submission.submittedAt.toISOString(),
      grade: submission.grade
        ? {
            ...submission.grade,
            score: submission.grade.score.toNumber(),
            gradedAt: submission.grade.gradedAt.toISOString(),
          }
        : null,
    }));
  }
  async gradeSubmission(
    teacherId: string,
    organizationId: string | null,
    submissionId: string,
    input: GradeSubmissionRequest,
  ): Promise<GradeSubmissionResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        assignment: {
          type: 'assignment',
          course: {
            organizationId,
          },
        },
      },
      select: {
        id: true,
        assignment: {
          select: {
            createdById: true,
            maxScore: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} was not found`,
      );
    }

    if (submission.assignment.createdById !== teacherId) {
      throw new ForbiddenException('You cannot grade this submission');
    }

    const maxScore = submission.assignment.maxScore.toNumber();

    if (input.score > maxScore) {
      throw new BadRequestException(
        `Score cannot exceed the assignment maximum of ${maxScore}`,
      );
    }

    const grade = await this.prisma.$transaction(async (tx) => {
      const savedGrade = await tx.grade.upsert({
        where: {
          submissionId,
        },
        update: {
          score: input.score,
          feedbackText: input.feedbackText,
          gradedById: teacherId,
          gradedAt: new Date(),
        },
        create: {
          submissionId,
          score: input.score,
          feedbackText: input.feedbackText,
          gradedById: teacherId,
        },
        select: {
          id: true,
          submissionId: true,
          quizAttemptId: true,
          score: true,
          feedbackText: true,
          gradedById: true,
          gradedAt: true,
        },
      });

      await tx.submission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: 'graded',
          teacherNote: input.feedbackText,
        },
      });

      return savedGrade;
    });

    return {
      ...grade,
      score: grade.score.toNumber(),
    };
  }
  async findAssignmentById(
    teacherId: string,
    organizationId: string | null,
    assignmentId: string,
  ): Promise<TeacherAssignmentResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        type: 'assignment',
        createdById: teacherId,
        course: {
          organizationId,
        },
      },
      select: {
        id: true,
        courseId: true,
        createdById: true,
        type: true,
        title: true,
        instructions: true,
        maxScore: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,
        noteToStudents: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} was not found`,
      );
    }

    return {
      ...assignment,
      type: 'assignment',
      maxScore: assignment.maxScore.toNumber(),
    };
  }
  async updateAssignment(
    teacherId: string,
    organizationId: string | null,
    assignmentId: string,
    input: UpdateTeacherAssignmentRequest,
  ): Promise<TeacherAssignmentResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    const existingAssignment = await this.requireOwnedAssignment(
      teacherId,
      organizationId,
      assignmentId,
    );

    if (input.courseId && input.courseId !== existingAssignment.courseId) {
      const course = await this.prisma.course.findFirst({
        where: {
          id: input.courseId,
          teacherId,
          organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!course) {
        throw new ForbiddenException(
          'You cannot move this assignment to the selected course',
        );
      }

      if (existingAssignment._count.submissions > 0) {
        throw new BadRequestException(
          'An assignment with submissions cannot be moved to another course',
        );
      }
    }

    const assignment = await this.prisma.assignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        ...(input.courseId !== undefined && {
          courseId: input.courseId,
        }),
        ...(input.title !== undefined && {
          title: input.title,
        }),
        ...(input.instructions !== undefined && {
          instructions: input.instructions,
        }),
        ...(input.maxScore !== undefined && {
          maxScore: input.maxScore,
        }),
        ...(input.startsAt !== undefined && {
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
        }),
        ...(input.dueAt !== undefined && {
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        }),
        ...(input.endsAt !== undefined && {
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
        }),
        ...(input.noteToStudents !== undefined && {
          noteToStudents: input.noteToStudents,
        }),
        ...(input.status !== undefined && {
          status: input.status,
        }),
      },
      select: {
        id: true,
        courseId: true,
        createdById: true,
        type: true,
        title: true,
        instructions: true,
        maxScore: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,
        noteToStudents: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return {
      ...assignment,
      type: 'assignment',
      maxScore: assignment.maxScore.toNumber(),
    };
  }

  async deleteAssignment(
    teacherId: string,
    organizationId: string | null,
    assignmentId: string,
  ): Promise<DeleteTeacherAssignmentResponse> {
    if (!organizationId) {
      throw new ForbiddenException(
        'Teacher account is not assigned to an organization',
      );
    }

    const assignment = await this.requireOwnedAssignment(
      teacherId,
      organizationId,
      assignmentId,
    );

    if (assignment._count.submissions > 0) {
      throw new BadRequestException(
        'Assignments with submissions cannot be deleted',
      );
    }

    await this.prisma.assignment.delete({
      where: {
        id: assignmentId,
      },
    });

    return {
      message: 'Assignment deleted successfully',
    };
  }
}
