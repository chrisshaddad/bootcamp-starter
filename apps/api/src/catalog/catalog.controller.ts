import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  medicineAvailabilityRequestSchema,
  medicineListQuerySchema,
  type MedicineAvailabilityRequest,
  type MedicineAvailabilityResponse,
  type MedicineListQuery,
  type MedicineListResponse,
  type MedicineResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { MedicinesService } from '../medicines/medicines.service';
import { CatalogService } from './catalog.service';

// Medicine ids are UUIDs; reject malformed path params before they reach Prisma.
const medicineIdSchema = z.uuid();

/**
 * Consumer-facing, read-only view of the global medicine catalog for clients:
 * browse/search, detail, ingredient-based alternatives, and nearest in-stock
 * availability. The catalog is global (no tenant scope); availability is
 * measured from the session user's saved location. No writes → no audit.
 */
@Controller('catalog')
@Roles('CLIENT')
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly medicines: MedicinesService,
  ) {}

  @Get('medicines')
  browse(
    @Query(new ZodValidationPipe(medicineListQuerySchema))
    query: MedicineListQuery,
  ): Promise<MedicineListResponse> {
    return this.medicines.list(query);
  }

  @Get('medicines/:id')
  async detail(
    @Param('id', new ZodValidationPipe(medicineIdSchema)) id: string,
  ): Promise<MedicineResponse> {
    const medicine = await this.medicines.getById(id);
    if (!medicine) {
      throw new NotFoundException('Medicine not found.');
    }
    return medicine;
  }

  @Get('medicines/:id/alternatives')
  alternatives(
    @Param('id', new ZodValidationPipe(medicineIdSchema)) id: string,
  ): Promise<MedicineResponse[]> {
    return this.catalog.alternatives(id);
  }

  @Get('medicines/:id/availability')
  availability(
    @Param('id', new ZodValidationPipe(medicineIdSchema)) id: string,
    @Query(new ZodValidationPipe(medicineAvailabilityRequestSchema))
    query: MedicineAvailabilityRequest,
    @CurrentUser() actor: User,
  ): Promise<MedicineAvailabilityResponse> {
    return this.catalog.availability(id, query, actor);
  }
}
