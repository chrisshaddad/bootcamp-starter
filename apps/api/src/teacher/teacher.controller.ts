import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { User } from '@repo/db';
import {
  createTeacherAssignmentRequestSchema,
  createTeacherQuizRequestSchema,
  gradeSubmissionRequestSchema,
  type CreateTeacherAssignmentRequest,
  type CreateTeacherQuizRequest,
  type DeleteTeacherAssignmentResponse,
  type GradeSubmissionRequest,
  type GradeSubmissionResponse,
  type TeacherAssignmentListResponse,
  type TeacherAssignmentResponse,
  type TeacherCourseListResponse,
  type TeacherQuizListResponse,
  type TeacherQuizResponse,
  type TeacherSubmissionListResponse,
  type UpdateTeacherAssignmentRequest,
  updateTeacherAssignmentRequestSchema,
  type DeleteTeacherQuizResponse,
  type UpdateTeacherQuizRequest,
  updateTeacherQuizRequestSchema,
} from '@repo/contracts';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TeacherService } from './teacher.service';

@Controller('teacher')
@Roles('ORG_ADMIN')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('courses')
  async findMyCourses(
    @CurrentUser() user: User,
  ): Promise<TeacherCourseListResponse> {
    return this.teacherService.findMyCourses(user.id, user.organizationId);
  }

  @Get('quizzes')
  async findMyQuizzes(
    @CurrentUser() user: User,
  ): Promise<TeacherQuizListResponse> {
    return this.teacherService.findMyQuizzes(user.id, user.organizationId);
  }

  @Post('quizzes')
  async createQuiz(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createTeacherQuizRequestSchema))
    body: CreateTeacherQuizRequest,
  ): Promise<TeacherQuizResponse> {
    return this.teacherService.createQuiz(user.id, user.organizationId, body);
  }

  @Get('quizzes/:quizId')
  async findQuizById(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
  ): Promise<TeacherQuizResponse> {
    return this.teacherService.findQuizById(
      user.id,
      user.organizationId,
      quizId,
    );
  }

  @Get('assignments')
  async findMyAssignments(
    @CurrentUser() user: User,
  ): Promise<TeacherAssignmentListResponse> {
    return this.teacherService.findMyAssignments(user.id, user.organizationId);
  }

  @Post('assignments')
  async createAssignment(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createTeacherAssignmentRequestSchema))
    body: CreateTeacherAssignmentRequest,
  ): Promise<TeacherAssignmentResponse> {
    return this.teacherService.createAssignment(
      user.id,
      user.organizationId,
      body,
    );
  }
  @Get('assignments/:assignmentId')
  async findAssignmentById(
    @CurrentUser() user: User,
    @Param('assignmentId') assignmentId: string,
  ): Promise<TeacherAssignmentResponse> {
    return this.teacherService.findAssignmentById(
      user.id,
      user.organizationId,
      assignmentId,
    );
  }
  @Get('assignments/:assignmentId/submissions')
  async findAssignmentSubmissions(
    @CurrentUser() user: User,
    @Param('assignmentId') assignmentId: string,
  ): Promise<TeacherSubmissionListResponse> {
    return this.teacherService.findAssignmentSubmissions(
      user.id,
      user.organizationId,
      assignmentId,
    );
  }
  @Patch('quizzes/:quizId')
  async updateQuiz(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(updateTeacherQuizRequestSchema))
    body: UpdateTeacherQuizRequest,
  ): Promise<TeacherQuizResponse> {
    return this.teacherService.updateQuiz(
      user.id,
      user.organizationId,
      quizId,
      body,
    );
  }

  @Delete('quizzes/:quizId')
  async deleteQuiz(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
  ): Promise<DeleteTeacherQuizResponse> {
    return this.teacherService.deleteQuiz(user.id, user.organizationId, quizId);
  }

  @Patch('submissions/:submissionId/grade')
  async gradeSubmission(
    @CurrentUser() user: User,
    @Param('submissionId') submissionId: string,
    @Body(new ZodValidationPipe(gradeSubmissionRequestSchema))
    body: GradeSubmissionRequest,
  ): Promise<GradeSubmissionResponse> {
    return this.teacherService.gradeSubmission(
      user.id,
      user.organizationId,
      submissionId,
      body,
    );
  }
  @Patch('assignments/:assignmentId')
  async updateAssignment(
    @CurrentUser() user: User,
    @Param('assignmentId') assignmentId: string,
    @Body(new ZodValidationPipe(updateTeacherAssignmentRequestSchema))
    body: UpdateTeacherAssignmentRequest,
  ): Promise<TeacherAssignmentResponse> {
    return this.teacherService.updateAssignment(
      user.id,
      user.organizationId,
      assignmentId,
      body,
    );
  }

  @Delete('assignments/:assignmentId')
  async deleteAssignment(
    @CurrentUser() user: User,
    @Param('assignmentId') assignmentId: string,
  ): Promise<DeleteTeacherAssignmentResponse> {
    return this.teacherService.deleteAssignment(
      user.id,
      user.organizationId,
      assignmentId,
    );
  }
}
