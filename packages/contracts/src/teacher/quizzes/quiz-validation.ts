import type { z } from 'zod';

interface QuizValidationInput {
  startsAt?: string | null;
  dueAt?: string | null;
  endsAt?: string | null;
  questions?: Array<{
    position: number;
  }>;
}

export function validateQuizScheduleAndPositions(
  quiz: QuizValidationInput,
  context: z.RefinementCtx,
): void {
  const startsAt = quiz.startsAt ? new Date(quiz.startsAt) : null;

  const dueAt = quiz.dueAt ? new Date(quiz.dueAt) : null;

  const endsAt = quiz.endsAt ? new Date(quiz.endsAt) : null;

  if (startsAt && endsAt && startsAt >= endsAt) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End date must be after the start date',
    });
  }

  if (startsAt && dueAt && dueAt < startsAt) {
    context.addIssue({
      code: 'custom',
      path: ['dueAt'],
      message: 'Due date cannot be before the start date',
    });
  }

  if (dueAt && endsAt && dueAt > endsAt) {
    context.addIssue({
      code: 'custom',
      path: ['dueAt'],
      message: 'Due date cannot be after the end date',
    });
  }

  if (quiz.questions) {
    const positions = quiz.questions.map((question) => question.position);

    if (new Set(positions).size !== positions.length) {
      context.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'Question positions must be unique',
      });
    }
  }
}
