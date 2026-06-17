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
import { ProductsService } from './products.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  productCreateRequestSchema,
  productUpdateRequestSchema,
  type ProductCreateRequest,
  type ProductUpdateRequest,
  type ProductListResponse,
  type ProductResponse,
} from '@repo/contracts';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<ProductListResponse> {
    return this.productsService.findAll(user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ProductResponse> {
    return this.productsService.findOne(id, user.organizationId!);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(productCreateRequestSchema))
    body: ProductCreateRequest,
    @CurrentUser() user: User,
  ): Promise<ProductResponse> {
    return this.productsService.create(user.organizationId!, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(productUpdateRequestSchema))
    body: ProductUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<ProductResponse> {
    return this.productsService.update(id, user.organizationId!, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.productsService.remove(id, user.organizationId!);
  }
}
