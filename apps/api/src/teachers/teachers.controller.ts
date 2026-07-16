import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type {
  AssignCourseGradeRequest,
  AssignCourseGradeResponse,
  TeacherActionResponse,
  TeacherOrganizationParams,
  TeacherOrganizationsResponse,
  TeachersByOrganizationResponse,
  UpdateTeacherRequest,
  UpdateTeacherResponse,
} from '@repo/contracts';
import {
  AssignCourseGradeRequestSchema,
  TeacherOrganizationParamsSchema,
  UpdateTeacherRequestSchema,
} from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TeachersService } from './teachers.service';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get('organizations')
  @Roles('SUPER_ADMIN')
  async findOrganizations(): Promise<TeacherOrganizationsResponse> {
    return this.teachersService.findOrganizations();
  }

  @Get('organizations/:organizationId')
  @Roles('SUPER_ADMIN')
  async findTeachersByOrganization(
    @Param(new ZodValidationPipe(TeacherOrganizationParamsSchema))
    params: TeacherOrganizationParams,
  ): Promise<TeachersByOrganizationResponse> {
    return this.teachersService.findTeachersByOrganization(
      params.organizationId,
    );
  }
  @Patch('organizations/:organizationId/teachers/:teacherId')
  @Roles('SUPER_ADMIN')
  async updateTeacher(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('teacherId', new ParseUUIDPipe({ version: '4' }))
    teacherId: string,
    @Body(new ZodValidationPipe(UpdateTeacherRequestSchema))
    payload: UpdateTeacherRequest,
  ): Promise<UpdateTeacherResponse> {
    return this.teachersService.updateTeacher(
      organizationId,
      teacherId,
      payload,
    );
  }

  @Delete('organizations/:organizationId/teachers/:teacherId')
  @Roles('SUPER_ADMIN')
  async deleteTeacher(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('teacherId', new ParseUUIDPipe({ version: '4' }))
    teacherId: string,
  ): Promise<TeacherActionResponse> {
    return this.teachersService.deleteTeacher(organizationId, teacherId);
  }

  @Post('course-grade-assignments')
  @Roles('SUPER_ADMIN')
  async assignCourseToTeacherAndGrade(
    @Body(new ZodValidationPipe(AssignCourseGradeRequestSchema))
    payload: AssignCourseGradeRequest,
  ): Promise<AssignCourseGradeResponse> {
    return this.teachersService.assignCourseToTeacherAndGrade(payload);
  }
}
