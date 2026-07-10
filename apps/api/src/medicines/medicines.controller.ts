import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  medicineCreateRequestSchema,
  medicineFilterSchema,
  medicineListQuerySchema,
  medicineUpdateRequestSchema,
  type MedicineCreateRequest,
  type MedicineFacetsResponse,
  type MedicineFilter,
  type MedicineIngredientOptionsResponse,
  type MedicineListQuery,
  type MedicineListResponse,
  type MedicineResponse,
  type MedicineStatsResponse,
  type MedicineUpdateRequest,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { MedicinesService } from './medicines.service';

// Medicine ids are UUIDs; reject malformed path params before they reach Prisma.
const medicineIdSchema = z.uuid();

// Super-admin catalog management. The global AuthGuard already requires a valid
// session; @Roles narrows access to platform admins. Medicines are global, so
// there is no tenant scope to enforce here.
@Controller('medicines')
@Roles('SUPER_ADMIN')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(medicineListQuerySchema))
    query: MedicineListQuery,
  ): Promise<MedicineListResponse> {
    return this.medicinesService.list(query);
  }

  @Get('stats')
  stats(): Promise<MedicineStatsResponse> {
    return this.medicinesService.stats();
  }

  @Get('facets')
  facets(
    @Query(new ZodValidationPipe(medicineFilterSchema))
    filters: MedicineFilter,
  ): Promise<MedicineFacetsResponse> {
    return this.medicinesService.facets(filters);
  }

  @Get('ingredients')
  ingredientOptions(): Promise<MedicineIngredientOptionsResponse> {
    return this.medicinesService.ingredientOptions();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(medicineCreateRequestSchema))
    body: MedicineCreateRequest,
    @CurrentUser() actor: User,
  ): Promise<MedicineResponse> {
    return this.medicinesService.create(body, actor.id);
  }

  @Patch(':id')
  update(
    @Param('id', new ZodValidationPipe(medicineIdSchema)) id: string,
    @Body(new ZodValidationPipe(medicineUpdateRequestSchema))
    body: MedicineUpdateRequest,
    @CurrentUser() actor: User,
  ): Promise<MedicineResponse> {
    return this.medicinesService.update(id, body, actor.id);
  }

  @Delete(':id')
  remove(
    @Param('id', new ZodValidationPipe(medicineIdSchema)) id: string,
    @CurrentUser() actor: User,
  ): Promise<MedicineResponse> {
    return this.medicinesService.remove(id, actor.id);
  }
}
