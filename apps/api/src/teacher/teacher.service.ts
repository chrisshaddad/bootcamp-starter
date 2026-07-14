import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTeacherAssignmentRequest,
  GradeSubmissionRequest,
  GradeSubmissionResponse,
  TeacherAssignmentListResponse,
  TeacherAssignmentResponse,
  TeacherCourseListResponse,
  TeacherSubmissionListResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TeacherService {
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

    const course = await this.prisma.course.findUnique({
      where: {
        id: input.courseId,
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

    const teacherOwnsCourse = course.teacherId === teacherId;
    const courseBelongsToOrganization =
      course.organizationId === organizationId;

    if (!teacherOwnsCourse || !courseBelongsToOrganization) {
      throw new ForbiddenException(
        'You cannot create assignments for this course',
      );
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        courseId: input.courseId,
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

  const assignment = await this.prisma.assignment.findUnique({
    where: {
      id: assignmentId,
    },
    select: {
      id: true,
      createdById: true,
      type: true,
      course: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!assignment || assignment.type !== 'assignment') {
    throw new NotFoundException(
      `Assignment with ID ${assignmentId} was not found`,
    );
  }

  if (
    assignment.createdById !== teacherId ||
    assignment.course.organizationId !== organizationId
  ) {
    throw new ForbiddenException(
      'You cannot view submissions for this assignment',
    );
  }

  const submissions = await this.prisma.submission.findMany({
    where: {
      assignmentId,
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
    grade: submission.grade
      ? {
          ...submission.grade,
          score: submission.grade.score.toNumber(),
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

  const submission = await this.prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      id: true,
      assignment: {
        select: {
          createdById: true,
          maxScore: true,
          course: {
            select: {
              organizationId: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new NotFoundException(
      `Submission with ID ${submissionId} was not found`,
    );
  }

  const teacherOwnsAssignment =
    submission.assignment.createdById === teacherId;

  const assignmentBelongsToOrganization =
    submission.assignment.course.organizationId === organizationId;

  if (!teacherOwnsAssignment || !assignmentBelongsToOrganization) {
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
}