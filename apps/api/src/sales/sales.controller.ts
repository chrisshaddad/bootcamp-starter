import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  saleCreateRequestSchema,
  saleUpdateRequestSchema,
  type SaleCreateRequest,
  type SaleUpdateRequest,
  type SaleListResponse,
  type SaleResponse,
} from '@repo/contracts';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ): Promise<SaleListResponse> {
    return this.salesService.findAll(user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      productId,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<SaleResponse> {
    return this.salesService.findOne(id, user.organizationId!);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(saleCreateRequestSchema))
    body: SaleCreateRequest,
    @CurrentUser() user: User,
  ): Promise<SaleResponse> {
    return this.salesService.create(user.organizationId!, user.id, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saleUpdateRequestSchema))
    body: SaleUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<SaleResponse> {
    return this.salesService.update(id, user.organizationId!, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.salesService.remove(id, user.organizationId!);
  }
}
