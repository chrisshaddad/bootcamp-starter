import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  StartQuizAttemptResponse,
  StudentAssignmentAvailability,
  StudentAssignmentListResponse,
  StudentAssignmentResponse,
  StudentQuizAttemptStatus,
  StudentQuizAvailability,
  StudentQuizListResponse,
  StudentQuizOptionResponse,
  StudentQuizResponse,
  SubmitAssignmentRequest,
  SubmitAssignmentResponse,
  SubmitQuizAttemptRequest,
  SubmitQuizAttemptResponse,
  UploadAssignmentFileResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
interface StoredQuizOption {
  id: string;
  text: string;
}

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyQuizzes(studentId: string): Promise<StudentQuizListResponse> {
    const now = new Date();

    const quizzes = await this.prisma.assignment.findMany({
      where: {
        type: {
          in: ['quiz', 'exam'],
        },
        status: 'published',
        course: {
          status: 'published',
          enrollments: {
            some: {
              studentId,
              status: 'active',
            },
          },
        },
      },
      orderBy: [
        {
          startsAt: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
      select: {
        id: true,
        courseId: true,
        type: true,
        title: true,
        instructions: true,
        maxScore: true,
        durationMinutes: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,

        course: {
          select: {
            id: true,
            title: true,
          },
        },

        _count: {
          select: {
            quizQuestions: true,
          },
        },

        quizAttempts: {
          where: {
            studentId,
          },
          take: 1,
          select: {
            id: true,
            startedAt: true,
            submittedAt: true,
            autoScore: true,
            totalPoints: true,
          },
        },
      },
    });

    return quizzes.map((quiz) => {
      const durationMinutes = quiz.durationMinutes ?? 0;
      const attempt = quiz.quizAttempts[0] ?? null;

      const expiresAt = attempt
        ? this.calculateAttemptExpiry(attempt.startedAt, durationMinutes)
        : null;

      return {
        id: quiz.id,
        courseId: quiz.courseId,
        type: quiz.type as 'quiz' | 'exam',
        title: quiz.title,
        instructions: quiz.instructions,
        maxScore: Number(quiz.maxScore),
        durationMinutes,

        startsAt: quiz.startsAt?.toISOString() ?? null,
        dueAt: quiz.dueAt?.toISOString() ?? null,
        endsAt: quiz.endsAt?.toISOString() ?? null,

        availability: this.getAvailability(now, quiz.startsAt, quiz.endsAt),

        attemptStatus: this.getAttemptStatus(now, attempt, expiresAt),

        course: quiz.course,

        questionCount: quiz._count.quizQuestions,

        attempt:
          attempt && expiresAt
            ? {
                id: attempt.id,
                startedAt: attempt.startedAt.toISOString(),
                submittedAt: attempt.submittedAt?.toISOString() ?? null,
                expiresAt: expiresAt.toISOString(),
                autoScore:
                  attempt.autoScore === null ? null : Number(attempt.autoScore),
                totalPoints:
                  attempt.totalPoints === null
                    ? null
                    : Number(attempt.totalPoints),
              }
            : null,
      };
    });
  }

  async findQuizById(
    studentId: string,
    quizId: string,
  ): Promise<StudentQuizResponse> {
    const now = new Date();

    const quiz = await this.prisma.assignment.findFirst({
      where: {
        id: quizId,
        type: {
          in: ['quiz', 'exam'],
        },
        status: 'published',
        course: {
          status: 'published',
          enrollments: {
            some: {
              studentId,
              status: 'active',
            },
          },
        },
      },
      select: {
        id: true,
        courseId: true,
        type: true,
        title: true,
        instructions: true,
        maxScore: true,
        durationMinutes: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,
        noteToStudents: true,

        course: {
          select: {
            id: true,
            title: true,
          },
        },

        quizQuestions: {
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
            questionText: true,
            questionType: true,
            options: true,
            points: true,
            position: true,
          },
        },

        quizAttempts: {
          where: {
            studentId,
          },
          take: 1,
          select: {
            id: true,
            startedAt: true,
            submittedAt: true,
            autoScore: true,
            totalPoints: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} was not found`);
    }

    const durationMinutes = quiz.durationMinutes ?? 0;
    const attempt = quiz.quizAttempts[0] ?? null;

    const expiresAt = attempt
      ? this.calculateAttemptExpiry(attempt.startedAt, durationMinutes)
      : null;

    return {
      id: quiz.id,
      courseId: quiz.courseId,
      type: quiz.type as 'quiz' | 'exam',
      title: quiz.title,
      instructions: quiz.instructions,
      maxScore: Number(quiz.maxScore),
      durationMinutes,

      startsAt: quiz.startsAt?.toISOString() ?? null,
      dueAt: quiz.dueAt?.toISOString() ?? null,
      endsAt: quiz.endsAt?.toISOString() ?? null,

      noteToStudents: quiz.noteToStudents,

      availability: this.getAvailability(now, quiz.startsAt, quiz.endsAt),

      attemptStatus: this.getAttemptStatus(now, attempt, expiresAt),

      course: quiz.course,

      questions: quiz.quizQuestions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        questionType: 'mcq' as const,
        options: this.parseOptions(question.options),
        points: Number(question.points),
        position: question.position,
      })),

      attempt:
        attempt && expiresAt
          ? {
              id: attempt.id,
              startedAt: attempt.startedAt.toISOString(),
              submittedAt: attempt.submittedAt?.toISOString() ?? null,
              expiresAt: expiresAt.toISOString(),
              autoScore:
                attempt.autoScore === null ? null : Number(attempt.autoScore),
              totalPoints:
                attempt.totalPoints === null
                  ? null
                  : Number(attempt.totalPoints),
            }
          : null,
    };
  }

  async startQuizAttempt(
    studentId: string,
    quizId: string,
  ): Promise<StartQuizAttemptResponse> {
    const now = new Date();

    const quiz = await this.prisma.assignment.findFirst({
      where: {
        id: quizId,
        type: {
          in: ['quiz', 'exam'],
        },
        status: 'published',
        course: {
          status: 'published',
          enrollments: {
            some: {
              studentId,
              status: 'active',
            },
          },
        },
      },
      select: {
        id: true,
        durationMinutes: true,
        startsAt: true,
        endsAt: true,
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} was not found`);
    }

    const availability = this.getAvailability(now, quiz.startsAt, quiz.endsAt);

    if (availability === 'upcoming') {
      throw new ConflictException('This quiz has not started yet');
    }

    if (availability === 'closed') {
      throw new ConflictException('This quiz is already closed');
    }

    const durationMinutes = quiz.durationMinutes ?? 0;

    if (durationMinutes <= 0) {
      throw new ConflictException('This quiz does not have a valid duration');
    }

    const existingAttempt = await this.prisma.quizAttempt.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: quizId,
          studentId,
        },
      },
      select: {
        id: true,
        assignmentId: true,
        startedAt: true,
        submittedAt: true,
      },
    });

    if (existingAttempt?.submittedAt) {
      throw new ConflictException('You have already submitted this quiz');
    }

    if (existingAttempt) {
      const expiresAt = this.calculateAttemptExpiry(
        existingAttempt.startedAt,
        durationMinutes,
      );

      if (now >= expiresAt) {
        throw new ConflictException('Your quiz attempt has expired');
      }

      return {
        id: existingAttempt.id,
        assignmentId: existingAttempt.assignmentId,
        startedAt: existingAttempt.startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'in_progress',
      };
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        assignmentId: quizId,
        studentId,
        answers: {},
      },
      select: {
        id: true,
        assignmentId: true,
        startedAt: true,
      },
    });

    const expiresAt = this.calculateAttemptExpiry(
      attempt.startedAt,
      durationMinutes,
    );

    return {
      id: attempt.id,
      assignmentId: attempt.assignmentId,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'in_progress',
    };
  }

  async submitQuizAttempt(
    studentId: string,
    quizId: string,
    input: SubmitQuizAttemptRequest,
  ): Promise<SubmitQuizAttemptResponse> {
    const now = new Date();

    const attempt = await this.prisma.quizAttempt.findFirst({
      where: {
        assignmentId: quizId,
        studentId,
        assignment: {
          type: {
            in: ['quiz', 'exam'],
          },
          status: 'published',
          course: {
            status: 'published',
            enrollments: {
              some: {
                studentId,
                status: 'active',
              },
            },
          },
        },
      },
      select: {
        id: true,
        assignmentId: true,
        startedAt: true,
        submittedAt: true,

        assignment: {
          select: {
            durationMinutes: true,

            quizQuestions: {
              orderBy: {
                position: 'asc',
              },
              select: {
                id: true,
                options: true,
                correctAnswer: true,
                points: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(
        'No quiz attempt was found. Start the quiz before submitting it.',
      );
    }

    if (attempt.submittedAt) {
      throw new ConflictException(
        'This quiz attempt has already been submitted',
      );
    }

    const durationMinutes = attempt.assignment.durationMinutes ?? 0;

    const expiresAt = this.calculateAttemptExpiry(
      attempt.startedAt,
      durationMinutes,
    );

    if (now >= expiresAt) {
      throw new BadRequestException(
        'The time limit for this quiz attempt has expired',
      );
    }

    const questions = attempt.assignment.quizQuestions;

    if (questions.length === 0) {
      throw new BadRequestException('This quiz does not contain any questions');
    }

    const answerByQuestionId = new Map(
      input.answers.map((answer) => [
        answer.questionId,
        answer.selectedOptionId,
      ]),
    );

    if (answerByQuestionId.size !== questions.length) {
      throw new BadRequestException(
        'Every quiz question must have exactly one answer',
      );
    }

    let autoScore = 0;
    let totalPoints = 0;

    const storedAnswers = questions.map((question) => {
      const selectedOptionId = answerByQuestionId.get(question.id);

      if (!selectedOptionId) {
        throw new BadRequestException(
          `Question ${question.id} has not been answered`,
        );
      }

      const options = this.parseOptions(question.options);

      const optionExists = options.some(
        (option) => option.id === selectedOptionId,
      );

      if (!optionExists) {
        throw new BadRequestException(
          `The selected option for question ${question.id} is invalid`,
        );
      }

      const correctOptionId = this.parseCorrectOptionId(question.correctAnswer);

      if (!correctOptionId) {
        throw new BadRequestException(
          `Question ${question.id} does not have a valid correct answer`,
        );
      }

      const points = Number(question.points);
      const isCorrect = selectedOptionId === correctOptionId;

      totalPoints += points;

      if (isCorrect) {
        autoScore += points;
      }

      return {
        questionId: question.id,
        selectedOptionId,
        isCorrect,
        pointsAwarded: isCorrect ? points : 0,
      };
    });

    for (const answer of input.answers) {
      const questionExists = questions.some(
        (question) => question.id === answer.questionId,
      );

      if (!questionExists) {
        throw new BadRequestException(
          `Question ${answer.questionId} does not belong to this quiz`,
        );
      }
    }

    const submittedAt = new Date();

    const result = await this.prisma.quizAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        answers: storedAnswers,
        autoScore,
        totalPoints,
        submittedAt,
      },
      select: {
        id: true,
        assignmentId: true,
        submittedAt: true,
        autoScore: true,
        totalPoints: true,
      },
    });

    if (!result.submittedAt) {
      throw new ConflictException('The quiz attempt could not be submitted');
    }

    return {
      id: result.id,
      assignmentId: result.assignmentId,
      submittedAt: result.submittedAt.toISOString(),
      autoScore: Number(result.autoScore ?? 0),
      totalPoints: Number(result.totalPoints ?? 0),
      status: 'submitted',
    };
  }
  async findMyAssignments(
    studentId: string,
  ): Promise<StudentAssignmentListResponse> {
    const now = new Date();

    const assignments = await this.prisma.assignment.findMany({
      where: {
        type: 'assignment',
        status: 'published',
        course: {
          status: 'published',
          enrollments: {
            some: {
              studentId,
              status: 'active',
            },
          },
        },
      },
      orderBy: [
        {
          dueAt: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
      select: {
        id: true,
        courseId: true,
        title: true,
        instructions: true,
        maxScore: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,

        course: {
          select: {
            id: true,
            title: true,
          },
        },

        submissions: {
          where: {
            studentId,
          },
          take: 1,
          select: {
            id: true,
            submittedAt: true,
            status: true,

            grade: {
              select: {
                score: true,
              },
            },
          },
        },
      },
    });

    return assignments.map((assignment) => {
      const submission = assignment.submissions[0] ?? null;

      return {
        id: assignment.id,
        courseId: assignment.courseId,
        type: 'assignment',
        title: assignment.title,
        instructions: assignment.instructions,
        maxScore: assignment.maxScore.toNumber(),
        startsAt: assignment.startsAt?.toISOString() ?? null,
        dueAt: assignment.dueAt?.toISOString() ?? null,
        endsAt: assignment.endsAt?.toISOString() ?? null,
        availability: this.getAssignmentAvailability(
          now,
          assignment.startsAt,
          assignment.endsAt,
        ),
        course: assignment.course,
        submission: submission
          ? {
              id: submission.id,
              submittedAt: submission.submittedAt.toISOString(),
              status: submission.status,
              score: submission.grade
                ? submission.grade.score.toNumber()
                : null,
            }
          : null,
      };
    });
  }

  async findAssignmentById(
    studentId: string,
    assignmentId: string,
  ): Promise<StudentAssignmentResponse> {
    const now = new Date();

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        type: 'assignment',
        status: 'published',
        course: {
          status: 'published',
          enrollments: {
            some: {
              studentId,
              status: 'active',
            },
          },
        },
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        instructions: true,
        noteToStudents: true,
        maxScore: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,

        course: {
          select: {
            id: true,
            title: true,
          },
        },

        submissions: {
          where: {
            studentId,
          },
          take: 1,
          select: {
            id: true,
            contentText: true,
            fileUrl: true,
            submittedAt: true,
            status: true,
            teacherNote: true,

            grade: {
              select: {
                id: true,
                score: true,
                feedbackText: true,
                gradedAt: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} was not found`,
      );
    }

    const submission = assignment.submissions[0] ?? null;

    return {
      id: assignment.id,
      courseId: assignment.courseId,
      type: 'assignment',
      title: assignment.title,
      instructions: assignment.instructions,
      noteToStudents: assignment.noteToStudents,
      maxScore: assignment.maxScore.toNumber(),
      startsAt: assignment.startsAt?.toISOString() ?? null,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      endsAt: assignment.endsAt?.toISOString() ?? null,
      availability: this.getAssignmentAvailability(
        now,
        assignment.startsAt,
        assignment.endsAt,
      ),
      course: assignment.course,
      submission: submission
        ? {
            id: submission.id,
            contentText: submission.contentText,
            fileUrl: submission.fileUrl
              ? `/student/submissions/${submission.id}/file`
              : null,
            submittedAt: submission.submittedAt.toISOString(),
            status: submission.status,
            teacherNote: submission.teacherNote,
            grade: submission.grade
              ? {
                  id: submission.grade.id,
                  score: submission.grade.score.toNumber(),
                  feedbackText: submission.grade.feedbackText,
                  gradedAt: submission.grade.gradedAt.toISOString(),
                }
              : null,
          }
        : null,
    };
  }

  async submitAssignment(
    studentId: string,
    assignmentId: string,
    input: SubmitAssignmentRequest,
  ): Promise<SubmitAssignmentResponse> {
    const now = new Date();

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        type: 'assignment',
        status: 'published',
        course: {
          status: 'published',
          enrollments: {
            some: {
              studentId,
              status: 'active',
            },
          },
        },
      },
      select: {
        id: true,
        startsAt: true,
        dueAt: true,
        endsAt: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} was not found`,
      );
    }

    const availability = this.getAssignmentAvailability(
      now,
      assignment.startsAt,
      assignment.endsAt,
    );

    if (availability === 'upcoming') {
      throw new ConflictException('This assignment has not started yet');
    }

    if (availability === 'closed') {
      throw new ConflictException('This assignment is already closed');
    }

    const existingSubmission = await this.prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingSubmission) {
      throw new ConflictException('You have already submitted this assignment');
    }

    const contentText = input.contentText?.trim() || null;
    const fileKey = input.fileKey?.trim() || null;

    if (!contentText && !fileKey) {
      throw new BadRequestException(
        'Provide a written response or upload a file',
      );
    }

    if (fileKey) {
      const expectedPrefix = `assignments/${assignmentId}/${studentId}/`;

      if (
        !fileKey.startsWith(expectedPrefix) ||
        fileKey.includes('..') ||
        fileKey.includes('\\')
      ) {
        throw new BadRequestException(
          'The uploaded file does not belong to this assignment',
        );
      }

      const absoluteFilePath = join(process.cwd(), 'uploads', fileKey);

      try {
        await access(absoluteFilePath);
      } catch {
        throw new BadRequestException('The uploaded file could not be found');
      }
    }

    const status =
      assignment.dueAt && now > assignment.dueAt ? 'late' : 'submitted';

    let submission;

    try {
      submission = await this.prisma.submission.create({
        data: {
          assignmentId,
          studentId,
          contentText,
          fileUrl: fileKey,
          submittedAt: now,
          status,
        },
        select: {
          id: true,
          assignmentId: true,
          studentId: true,
          contentText: true,
          fileUrl: true,
          submittedAt: true,
          status: true,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You have already submitted this assignment',
        );
      }

      throw error;
    }

    return {
      ...submission,
      fileUrl: submission.fileUrl
        ? `/student/submissions/${submission.id}/file`
        : null,
      submittedAt: submission.submittedAt.toISOString(),
    };
  }

  async uploadAssignmentFile(
    studentId: string,
    assignmentId: string,
    file: Express.Multer.File,
  ): Promise<UploadAssignmentFileResponse> {
    const now = new Date();

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        type: 'assignment',
        status: 'published',
        course: {
          status: 'published',
          enrollments: {
            some: {
              studentId,
              status: 'active',
            },
          },
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        submissions: {
          where: {
            studentId,
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} was not found`,
      );
    }

    const availability = this.getAssignmentAvailability(
      now,
      assignment.startsAt,
      assignment.endsAt,
    );

    if (availability === 'upcoming') {
      throw new ConflictException('This assignment has not started yet');
    }

    if (availability === 'closed') {
      throw new ConflictException('This assignment is already closed');
    }

    if (assignment.submissions.length > 0) {
      throw new ConflictException('You have already submitted this assignment');
    }

    const extension = extname(file.originalname).toLowerCase();

    const allowedExtensions = new Set([
      '.pdf',
      '.docx',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
    ]);

    if (!allowedExtensions.has(extension)) {
      throw new BadRequestException(
        'Only PDF, DOCX, JPG, JPEG, PNG, GIF, and WEBP files are allowed',
      );
    }

    if (!this.hasValidFileSignature(file, extension)) {
      throw new BadRequestException(
        'The uploaded file content does not match a supported file type',
      );
    }

    const storedFileName = `${randomUUID()}${extension}`;

    const fileKey = [
      'assignments',
      assignmentId,
      studentId,
      storedFileName,
    ].join('/');

    const uploadDirectory = join(
      process.cwd(),
      'uploads',
      'assignments',
      assignmentId,
      studentId,
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    await writeFile(join(uploadDirectory, storedFileName), file.buffer);

    return {
      fileKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
  async getSubmissionFile(
    studentId: string,
    submissionId: string,
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        studentId,
      },
      select: {
        id: true,
        fileUrl: true,
      },
    });

    if (!submission?.fileUrl) {
      throw new NotFoundException('Submitted file was not found');
    }

    const expectedPrefix = `assignments/`;

    if (
      !submission.fileUrl.startsWith(expectedPrefix) ||
      submission.fileUrl.includes('..') ||
      submission.fileUrl.includes('\\')
    ) {
      throw new NotFoundException('Submitted file was not found');
    }

    const absoluteFilePath = join(process.cwd(), 'uploads', submission.fileUrl);

    let buffer: Buffer;

    try {
      buffer = await readFile(absoluteFilePath);
    } catch {
      throw new NotFoundException('Submitted file was not found');
    }

    const extension = extname(submission.fileUrl).toLowerCase();

    return {
      buffer,
      fileName: `submission-${submission.id}${extension}`,
      mimeType: this.getFileMimeType(extension),
    };
  }
  private getFileMimeType(extension: string): string {
    switch (extension) {
      case '.pdf':
        return 'application/pdf';

      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';

      case '.png':
        return 'image/png';

      case '.gif':
        return 'image/gif';

      case '.webp':
        return 'image/webp';

      default:
        return 'application/octet-stream';
    }
  }
  private parseCorrectOptionId(value: unknown): string | null {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('optionId' in value) ||
      typeof value.optionId !== 'string'
    ) {
      return null;
    }

    return value.optionId;
  }
  private getAssignmentAvailability(
    now: Date,
    startsAt: Date | null,
    endsAt: Date | null,
  ): StudentAssignmentAvailability {
    if (startsAt && now < startsAt) {
      return 'upcoming';
    }

    if (endsAt && now > endsAt) {
      return 'closed';
    }

    return 'open';
  }
  private getAvailability(
    now: Date,
    startsAt: Date | null,
    endsAt: Date | null,
  ): StudentQuizAvailability {
    if (startsAt && now < startsAt) {
      return 'upcoming';
    }

    if (endsAt && now > endsAt) {
      return 'closed';
    }

    return 'available';
  }

  private getAttemptStatus(
    now: Date,
    attempt: {
      submittedAt: Date | null;
    } | null,
    expiresAt: Date | null,
  ): StudentQuizAttemptStatus {
    if (!attempt) {
      return 'none';
    }

    if (attempt.submittedAt) {
      return 'submitted';
    }

    if (expiresAt && now >= expiresAt) {
      return 'expired';
    }

    return 'in_progress';
  }

  private calculateAttemptExpiry(
    startedAt: Date,
    durationMinutes: number,
  ): Date {
    return new Date(startedAt.getTime() + durationMinutes * 60_000);
  }

  private parseOptions(value: unknown): StudentQuizOptionResponse[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((option) => {
      if (
        typeof option !== 'object' ||
        option === null ||
        !('id' in option) ||
        !('text' in option) ||
        typeof option.id !== 'string' ||
        typeof option.text !== 'string'
      ) {
        return [];
      }

      const parsedOption: StoredQuizOption = {
        id: option.id,
        text: option.text,
      };

      return [parsedOption];
    });
  }
  private hasValidFileSignature(
    file: Express.Multer.File,
    extension: string,
  ): boolean {
    const buffer = file.buffer;

    if (extension === '.pdf') {
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }

    if (extension === '.jpg' || extension === '.jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (extension === '.png') {
      const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      return (
        buffer.length >= pngSignature.length &&
        buffer.subarray(0, pngSignature.length).equals(pngSignature)
      );
    }

    if (extension === '.gif') {
      const signature = buffer.subarray(0, 6).toString('ascii');

      return signature === 'GIF87a' || signature === 'GIF89a';
    }

    if (extension === '.webp') {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }

    if (extension === '.docx') {
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      );
    }

    return false;
  }
}
