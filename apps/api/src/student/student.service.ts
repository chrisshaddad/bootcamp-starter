import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  StartQuizAttemptResponse,
  StudentQuizAttemptStatus,
  StudentQuizAvailability,
  StudentQuizListResponse,
  StudentQuizOptionResponse,
  StudentQuizResponse,
  SubmitQuizAttemptRequest,
  SubmitQuizAttemptResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

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
}
