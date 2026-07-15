import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import type {
  TeacherActionResponse,
  TeacherOrganizationParams,
  TeacherOrganizationsResponse,
  TeachersByOrganizationResponse,
  UpdateTeacherRequest,
  UpdateTeacherResponse,
} from '@repo/contracts';
import {
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

  @Patch(':teacherId')
  @Roles('SUPER_ADMIN')
  async updateTeacher(
    @Param('teacherId') teacherId: string,
    @Body(new ZodValidationPipe(UpdateTeacherRequestSchema))
    payload: UpdateTeacherRequest,
  ): Promise<UpdateTeacherResponse> {
    return this.teachersService.updateTeacher(teacherId, payload);
  }

  @Delete(':teacherId')
  @Roles('SUPER_ADMIN')
  async deleteTeacher(
    @Param('teacherId') teacherId: string,
  ): Promise<TeacherActionResponse> {
    return this.teachersService.deleteTeacher(teacherId);
  }
}
