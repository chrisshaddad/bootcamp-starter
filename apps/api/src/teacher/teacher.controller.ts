import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { User } from '@repo/db';
import {
  createTeacherAssignmentRequestSchema,
  gradeSubmissionRequestSchema,
  type CreateTeacherAssignmentRequest,
  type GradeSubmissionRequest,
  type GradeSubmissionResponse,
  type TeacherAssignmentListResponse,
  type TeacherAssignmentResponse,
  type TeacherCourseListResponse,
  type TeacherSubmissionListResponse,
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

  @Get('assignments')
  async findMyAssignments(
    @CurrentUser() user: User,
  ): Promise<TeacherAssignmentListResponse> {
    return this.teacherService.findMyAssignments(
      user.id,
      user.organizationId,
    );
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
}