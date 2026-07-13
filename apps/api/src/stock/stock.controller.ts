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
  stockBatchCreateRequestSchema,
  stockBatchUpdateRequestSchema,
  stockBranchScopeQuerySchema,
  stockCatalogQuerySchema,
  stockListQuerySchema,
  type MedicineCreateRequest,
  type StockAttributesResponse,
  type StockBatchCreateRequest,
  type StockBatchResponse,
  type StockBatchUpdateRequest,
  type StockBranchOptionsResponse,
  type StockBranchScopeQuery,
  type StockCatalogItem,
  type StockCatalogQuery,
  type StockCatalogResponse,
  type StockListQuery,
  type StockListResponse,
  type StockMedicineDetailResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { StockService } from './stock.service';

// Ids are UUIDs; reject malformed path params before they reach Prisma.
const idSchema = z.uuid();

// Branch inventory. The global AuthGuard requires a valid session; the
// class-level @Roles narrows WRITES to the stock manager (their own branch) and
// the pharmacy admin (cross-branch oversight within their pharmacy). The GET
// handlers widen the allow-list to include the PHARMACY_EMPLOYEE, who gets
// read-only visibility of their branch's stock. Every handler resolves its
// branch from the session actor — never from a request-supplied branchId.
@Controller('stock')
@Roles('STOCK_MANAGER', 'PHARMACY_ADMIN')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @Roles('STOCK_MANAGER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE')
  list(
    @Query(new ZodValidationPipe(stockListQuerySchema)) query: StockListQuery,
    @CurrentUser() actor: User,
  ): Promise<StockListResponse> {
    return this.stockService.list(query, actor);
  }

  @Get('branches')
  @Roles('STOCK_MANAGER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE')
  branches(@CurrentUser() actor: User): Promise<StockBranchOptionsResponse> {
    return this.stockService.branchOptions(actor);
  }

  @Get('attributes')
  @Roles('STOCK_MANAGER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE')
  attributes(): Promise<StockAttributesResponse> {
    return this.stockService.attributes();
  }

  @Get('catalog')
  @Roles('STOCK_MANAGER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE')
  catalog(
    @Query(new ZodValidationPipe(stockCatalogQuerySchema))
    query: StockCatalogQuery,
  ): Promise<StockCatalogResponse> {
    return this.stockService.catalog(query);
  }

  @Post('catalog')
  createCatalogMedicine(
    @Body(new ZodValidationPipe(medicineCreateRequestSchema))
    body: MedicineCreateRequest,
    @CurrentUser() actor: User,
  ): Promise<StockCatalogItem> {
    return this.stockService.createCatalogMedicine(body, actor);
  }

  @Get('medicines/:medicineId')
  @Roles('STOCK_MANAGER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE')
  medicineDetail(
    @Param('medicineId', new ZodValidationPipe(idSchema)) medicineId: string,
    @Query(new ZodValidationPipe(stockBranchScopeQuerySchema))
    query: StockBranchScopeQuery,
    @CurrentUser() actor: User,
  ): Promise<StockMedicineDetailResponse> {
    return this.stockService.medicineDetail(medicineId, query.branchId, actor);
  }

  @Post('batches')
  createBatch(
    @Body(new ZodValidationPipe(stockBatchCreateRequestSchema))
    body: StockBatchCreateRequest,
    @CurrentUser() actor: User,
  ): Promise<StockBatchResponse> {
    return this.stockService.createBatch(body, actor);
  }

  @Patch('batches/:id')
  updateBatch(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(stockBatchUpdateRequestSchema))
    body: StockBatchUpdateRequest,
    @CurrentUser() actor: User,
  ): Promise<StockBatchResponse> {
    return this.stockService.updateBatch(id, body, actor);
  }

  @Delete('batches/:id')
  deleteBatch(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() actor: User,
  ): Promise<StockBatchResponse> {
    return this.stockService.deleteBatch(id, actor);
  }
}
