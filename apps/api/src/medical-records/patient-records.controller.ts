import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  recordCreateRequestSchema,
  recordListQuerySchema,
  type RecordCreateRequest,
  type RecordListQuery,
  type RecordListResponse,
  type RecordDetailResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('patients/:patientId/records')
export class PatientRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Get()
  @Roles('INSTITUTION_ADMIN', 'PROFESSIONAL', 'PATIENT')
  async findForPatient(
    @Param('patientId') patientId: string,
    @Query(new ZodValidationPipe(recordListQuerySchema))
    query: RecordListQuery,
    @CurrentUser() user: User,
  ): Promise<RecordListResponse> {
    return this.recordsService.findForPatient(patientId, query, user);
  }

  @Post()
  @Roles('PROFESSIONAL')
  async create(
    @Param('patientId') patientId: string,
    @Body(new ZodValidationPipe(recordCreateRequestSchema))
    body: RecordCreateRequest,
    @CurrentUser() user: User,
  ): Promise<RecordDetailResponse> {
    return this.recordsService.create(patientId, body, user);
  }
}
