import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { IMPORT_QUEUE, IMPORT_JOBS } from './imports.constants';
import type {
  ImportResponse,
  ImportListResponse,
  ImportRowListResponse,
} from '@repo/contracts';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(IMPORT_QUEUE) private readonly importQueue: Queue,
  ) {}

  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number },
  ): Promise<ImportListResponse> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [imports, total] = await Promise.all([
      this.prisma.import.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.import.count({ where: { organizationId } }),
    ]);

    return {
      imports: imports.map((i) => this.toResponse(i)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<ImportResponse> {
    const imp = await this.prisma.import.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!imp) {
      throw new NotFoundException(`Import ${id} not found`);
    }

    return this.toResponse(imp);
  }

  async findRows(
    importId: string,
    organizationId: string,
    options: { page?: number; limit?: number; status?: string },
  ): Promise<ImportRowListResponse> {
    // Verify org ownership
    await this.findOne(importId, organizationId);

    const { page = 1, limit = 50, status } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { importId };
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.importRow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rowNumber: 'asc' },
      }),
      this.prisma.importRow.count({ where }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        importId: r.importId,
        rowNumber: r.rowNumber,
        rawData: r.rawData as Record<string, unknown>,
        status: r.status as 'pending' | 'success' | 'error',
        errorMsg: r.errorMsg,
        entityId: r.entityId,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create an import record and enqueue the processing job.
   * The file content is passed as a base64 string (from the controller).
   */
  async create(
    organizationId: string,
    createdById: string,
    params: {
      type: 'EXPENSES' | 'SALES' | 'PRODUCTS' | 'SERVICES';
      fileName: string;
      fileContent: string; // base64
      columnMapping: Record<string, string>;
    },
  ): Promise<ImportResponse> {
    if (!params.fileContent) {
      throw new BadRequestException('File content is required');
    }

    const imp = await this.prisma.import.create({
      data: {
        organizationId,
        createdById,
        type: params.type,
        status: 'PENDING',
        fileName: params.fileName,
        columnMapping: params.columnMapping,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Enqueue processing job
    await this.importQueue.add(
      IMPORT_JOBS.PROCESS_FILE,
      {
        importId: imp.id,
        organizationId,
        createdById,
        type: params.type,
        fileContent: params.fileContent,
        columnMapping: params.columnMapping,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(
      `Import ${imp.id} created and queued for org ${organizationId}`,
    );
    return this.toResponse(imp);
  }

  async reprocess(id: string, organizationId: string): Promise<ImportResponse> {
    const imp = await this.findOne(id, organizationId);

    if (imp.status === 'PROCESSING') {
      throw new BadRequestException('Import is already being processed');
    }

    // Reset status
    await this.prisma.import.update({
      where: { id },
      data: {
        status: 'PENDING',
        successCount: 0,
        errorCount: 0,
        errorSummary: null,
        processedAt: null,
      },
    });

    // Reset rows
    await this.prisma.importRow.updateMany({
      where: { importId: id },
      data: { status: 'pending', errorMsg: null, entityId: null },
    });

    await this.importQueue.add(
      IMPORT_JOBS.PROCESS_FILE,
      {
        importId: id,
        organizationId,
        createdById: imp.createdById,
        type: imp.type,
        columnMapping: imp.columnMapping ?? {},
        reprocess: true,
      },
      { attempts: 3 },
    );

    this.logger.log(`Import ${id} requeued for reprocessing`);
    return this.findOne(id, organizationId);
  }

  private toResponse(imp: any): ImportResponse {
    return {
      id: imp.id,
      organizationId: imp.organizationId,
      createdById: imp.createdById,
      type: imp.type,
      status: imp.status,
      fileName: imp.fileName,
      fileUrl: imp.fileUrl,
      rowCount: imp.rowCount,
      successCount: imp.successCount,
      errorCount: imp.errorCount,
      columnMapping: imp.columnMapping,
      errorSummary: imp.errorSummary,
      processedAt: imp.processedAt ? imp.processedAt.toISOString() : null,
      createdAt: imp.createdAt.toISOString(),
      updatedAt: imp.updatedAt.toISOString(),
      createdBy: imp.createdBy,
    };
  }
}
