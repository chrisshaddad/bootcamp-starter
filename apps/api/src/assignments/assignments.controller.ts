import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  assignmentCreateRequestSchema,
  assignmentListQuerySchema,
  type AssignmentCreateRequest,
  type AssignmentListQuery,
  type AssignmentResponse,
  type AssignmentListResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @Roles('INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL')
  async findForPatient(
    @Query(new ZodValidationPipe(assignmentListQuerySchema))
    query: AssignmentListQuery,
    @CurrentUser() user: User,
  ): Promise<AssignmentListResponse> {
    return this.assignmentsService.findForPatient(query.patientId, user);
  }

  @Post()
  @Roles('INSTITUTION_ADMIN', 'STAFF')
  async create(
    @Body(new ZodValidationPipe(assignmentCreateRequestSchema))
    body: AssignmentCreateRequest,
    @CurrentUser() user: User,
  ): Promise<AssignmentResponse> {
    return this.assignmentsService.create(body, user);
  }

  @Patch(':id/deactivate')
  @Roles('INSTITUTION_ADMIN', 'STAFF')
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<AssignmentResponse> {
    return this.assignmentsService.deactivate(id, user);
  }
}
