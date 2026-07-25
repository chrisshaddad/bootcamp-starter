import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type {
  StartQuizAttemptResponse,
  StudentQuizListResponse,
  StudentQuizResponse,
  SubmitQuizAttemptRequest,
  SubmitQuizAttemptResponse,
} from '@repo/contracts';

import { submitQuizAttemptRequestSchema } from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import { StudentService } from './student.service';

@Controller('student')
@Roles('MEMBER')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('quizzes')
  async findMyQuizzes(
    @CurrentUser('id') studentId: string,
  ): Promise<StudentQuizListResponse> {
    return this.studentService.findMyQuizzes(studentId);
  }

  @Get('quizzes/:quizId')
  async findQuizById(
    @CurrentUser('id') studentId: string,
    @Param('quizId', new ParseUUIDPipe({ version: '4' }))
    quizId: string,
  ): Promise<StudentQuizResponse> {
    return this.studentService.findQuizById(studentId, quizId);
  }

  @Post('quizzes/:quizId/start')
  async startQuizAttempt(
    @CurrentUser('id') studentId: string,
    @Param('quizId', new ParseUUIDPipe({ version: '4' }))
    quizId: string,
  ): Promise<StartQuizAttemptResponse> {
    return this.studentService.startQuizAttempt(studentId, quizId);
  }
  @Post('quizzes/:quizId/submit')
  async submitQuizAttempt(
    @CurrentUser('id') studentId: string,
    @Param('quizId', new ParseUUIDPipe({ version: '4' }))
    quizId: string,
    @Body(new ZodValidationPipe(submitQuizAttemptRequestSchema))
    input: SubmitQuizAttemptRequest,
  ): Promise<SubmitQuizAttemptResponse> {
    return this.studentService.submitQuizAttempt(studentId, quizId, input);
  }
}
