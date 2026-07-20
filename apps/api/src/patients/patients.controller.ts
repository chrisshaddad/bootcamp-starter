import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  patientCreateRequestSchema,
  patientAdminUpdateRequestSchema,
  patientClinicalUpdateRequestSchema,
  patientListQuerySchema,
  userStatusRequestSchema,
  type PatientCreateRequest,
  type PatientAdminUpdateRequest,
  type PatientClinicalUpdateRequest,
  type PatientListQuery,
  type PatientListResponse,
  type PatientDetailResponse,
  type UserStatusRequest,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Roles('INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL')
  async findAll(
    @Query(new ZodValidationPipe(patientListQuerySchema))
    query: PatientListQuery,
    @CurrentUser() user: User,
  ): Promise<PatientListResponse> {
    return this.patientsService.findAll(query, user);
  }

  // Patient portal — the caller's own record. Declared before :id.
  @Get('me')
  @Roles('PATIENT')
  async findMe(@CurrentUser() user: User): Promise<PatientDetailResponse> {
    return this.patientsService.findMe(user);
  }

  @Get(':id')
  @Roles('INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL', 'PATIENT')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<PatientDetailResponse> {
    return this.patientsService.findOneForUser(id, user);
  }

  @Post()
  @Roles('INSTITUTION_ADMIN', 'STAFF')
  async create(
    @Body(new ZodValidationPipe(patientCreateRequestSchema))
    body: PatientCreateRequest,
    @CurrentUser() user: User,
  ): Promise<PatientDetailResponse> {
    return this.patientsService.create(body, user);
  }

  @Patch(':id/admin')
  @Roles('INSTITUTION_ADMIN', 'STAFF')
  async updateAdmin(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patientAdminUpdateRequestSchema))
    body: PatientAdminUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<PatientDetailResponse> {
    return this.patientsService.updateAdmin(id, body, user);
  }

  @Patch(':id/clinical')
  @Roles('INSTITUTION_ADMIN', 'PROFESSIONAL')
  async updateClinical(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patientClinicalUpdateRequestSchema))
    body: PatientClinicalUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<PatientDetailResponse> {
    return this.patientsService.updateClinical(id, body, user);
  }

  @Patch(':id/status')
  @Roles('INSTITUTION_ADMIN', 'STAFF')
  async setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userStatusRequestSchema))
    body: UserStatusRequest,
    @CurrentUser() user: User,
  ): Promise<PatientDetailResponse> {
    return this.patientsService.setStatus(id, body.isActive, user);
  }
}
