import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  submitAssignmentRequestSchema,
  submitQuizAttemptRequestSchema,
  type StartQuizAttemptResponse,
  type StudentAssignmentListResponse,
  type StudentAssignmentResponse,
  type StudentQuizListResponse,
  type StudentQuizResponse,
  type SubmitAssignmentRequest,
  type SubmitAssignmentResponse,
  type SubmitQuizAttemptRequest,
  type SubmitQuizAttemptResponse,
  type UploadAssignmentFileResponse,
} from '@repo/contracts';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StudentService } from './student.service';

@Controller('student')
@Roles('MEMBER')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('assignments')
  async findMyAssignments(
    @CurrentUser('id') studentId: string,
  ): Promise<StudentAssignmentListResponse> {
    return this.studentService.findMyAssignments(studentId);
  }

  @Get('assignments/:assignmentId')
  async findAssignmentById(
    @CurrentUser('id') studentId: string,
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' }))
    assignmentId: string,
  ): Promise<StudentAssignmentResponse> {
    return this.studentService.findAssignmentById(studentId, assignmentId);
  }

  @Post('assignments/:assignmentId/submit')
  async submitAssignment(
    @CurrentUser('id') studentId: string,
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' }))
    assignmentId: string,
    @Body(new ZodValidationPipe(submitAssignmentRequestSchema))
    input: SubmitAssignmentRequest,
  ): Promise<SubmitAssignmentResponse> {
    return this.studentService.submitAssignment(studentId, assignmentId, input);
  }

  @Get('submissions/:submissionId/file')
  async downloadSubmissionFile(
    @CurrentUser('id') studentId: string,
    @Param('submissionId', new ParseUUIDPipe({ version: '4' }))
    submissionId: string,
  ): Promise<StreamableFile> {
    const file = await this.studentService.getSubmissionFile(
      studentId,
      submissionId,
    );

    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: `inline; filename="${file.fileName}"`,
      length: file.buffer.length,
    });
  }

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

  @Post('assignments/:assignmentId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadAssignmentFile(
    @CurrentUser('id') studentId: string,
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' }))
    assignmentId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadAssignmentFileResponse> {
    if (!file) {
      throw new BadRequestException('Select a file to upload');
    }

    return this.studentService.uploadAssignmentFile(
      studentId,
      assignmentId,
      file,
    );
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
