import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type {
  StudentOrganizationGradesResponse,
  StudentOrganizationsResponse,
  StudentsByGradeResponse,
} from '@repo/contracts';
import { Roles } from '../auth/decorators';
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
}
