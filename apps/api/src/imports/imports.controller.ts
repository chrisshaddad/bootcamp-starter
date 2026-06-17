import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  importCreateRequestSchema,
  type ImportCreateRequest,
  type ImportListResponse,
  type ImportResponse,
  type ImportRowListResponse,
} from '@repo/contracts';
import { z } from 'zod';

// Extended schema that also accepts the file content
const importUploadSchema = importCreateRequestSchema.extend({
  fileContent: z.string().min(1, 'File content is required'), // base64 CSV
});

type ImportUploadRequest = z.infer<typeof importUploadSchema>;

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ImportListResponse> {
    return this.importsService.findAll(user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ImportResponse> {
    return this.importsService.findOne(id, user.organizationId!);
  }

  @Get(':id/rows')
  async findRows(
    @Param('id') importId: string,
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<ImportRowListResponse> {
    return this.importsService.findRows(importId, user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      status,
    });
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(importUploadSchema))
    body: ImportUploadRequest,
    @CurrentUser() user: User,
  ): Promise<ImportResponse> {
    return this.importsService.create(user.organizationId!, user.id, {
      type: body.type,
      fileName: body.fileName,
      fileContent: body.fileContent,
      columnMapping: body.columnMapping,
    });
  }

  @Post(':id/reprocess')
  async reprocess(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ImportResponse> {
    return this.importsService.reprocess(id, user.organizationId!);
  }
}
