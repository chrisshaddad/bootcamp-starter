import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import type {
  StudentActionResponse,
  StudentOrganizationGradesResponse,
  StudentOrganizationsResponse,
  StudentsByGradeResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@repo/contracts';
import { UpdateStudentRequestSchema } from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('organizations')
  @Roles('SUPER_ADMIN')
  async findOrganizations(): Promise<StudentOrganizationsResponse> {
    return this.studentsService.findOrganizations();
  }

  @Get('organizations/:organizationId/grades')
  @Roles('SUPER_ADMIN')
  async findGradesByOrganization(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
  ): Promise<StudentOrganizationGradesResponse> {
    return this.studentsService.findGradesByOrganization(organizationId);
  }

  @Get('organizations/:organizationId/grades/:gradeId')
  @Roles('SUPER_ADMIN')
  async findStudentsByOrganizationAndGrade(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('gradeId', new ParseUUIDPipe({ version: '4' }))
    gradeId: string,
  ): Promise<StudentsByGradeResponse> {
    return this.studentsService.findStudentsByOrganizationAndGrade(
      organizationId,
      gradeId,
    );
  }
  @Patch('organizations/:organizationId/students/:studentProfileId')
  @Roles('SUPER_ADMIN')
  async updateStudent(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('studentProfileId', new ParseUUIDPipe({ version: '4' }))
    studentProfileId: string,
    @Body(new ZodValidationPipe(UpdateStudentRequestSchema))
    payload: UpdateStudentRequest,
  ): Promise<UpdateStudentResponse> {
    return this.studentsService.updateStudent(
      organizationId,
      studentProfileId,
      payload,
    );
  }

  @Delete('organizations/:organizationId/students/:studentProfileId')
  @Roles('SUPER_ADMIN')
  async deleteStudent(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('studentProfileId', new ParseUUIDPipe({ version: '4' }))
    studentProfileId: string,
  ): Promise<StudentActionResponse> {
    return this.studentsService.deleteStudent(organizationId, studentProfileId);
  }
}
