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
  DeleteCourseResponse,
  CourseListResponse,
  UpdateCourseRequest,
  UpdateCourseResponse,
} from '@repo/contracts';
import { UpdateCourseRequestSchema } from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CoursesService } from './courses.service';

@Controller('courses')
@Roles('SUPER_ADMIN')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('organizations/:organizationId')
  async findCoursesByOrganization(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
  ): Promise<CourseListResponse> {
    return this.coursesService.findCoursesByOrganization(organizationId);
  }

  @Patch('organizations/:organizationId/courses/:courseId')
  async updateCourse(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('courseId', new ParseUUIDPipe({ version: '4' }))
    courseId: string,
    @Body(new ZodValidationPipe(UpdateCourseRequestSchema))
    payload: UpdateCourseRequest,
  ): Promise<UpdateCourseResponse> {
    return this.coursesService.updateCourse(organizationId, courseId, payload);
  }

  @Delete('organizations/:organizationId/courses/:courseId')
  async deleteCourse(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('courseId', new ParseUUIDPipe({ version: '4' }))
    courseId: string,
  ): Promise<DeleteCourseResponse> {
    return this.coursesService.deleteCourse(organizationId, courseId);
  }
}
