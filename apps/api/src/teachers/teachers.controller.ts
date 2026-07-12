import { Controller, Get, Param } from '@nestjs/common';
import type {
  TeacherOrganizationParams,
  TeacherOrganizationsResponse,
  TeachersByOrganizationResponse,
} from '@repo/contracts';
import { TeacherOrganizationParamsSchema } from '@repo/contracts';
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
}
