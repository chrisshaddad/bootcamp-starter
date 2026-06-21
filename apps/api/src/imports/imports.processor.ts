import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { IMPORT_QUEUE, IMPORT_JOBS } from './imports.constants';

interface ProcessFileJobData {
  importId: string;
  organizationId: string;
  createdById: string;
  type: 'EXPENSES' | 'SALES' | 'PRODUCTS' | 'SERVICES';
  fileContent?: string; // base64 CSV
  columnMapping: Record<string, string>;
  reprocess?: boolean;
}

interface ParsedRow {
  [key: string]: string;
}

@Processor(IMPORT_QUEUE)
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ProcessFileJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);

    switch (job.name) {
      case IMPORT_JOBS.PROCESS_FILE:
        await this.handleProcessFile(job.data);
        break;
      default:
        this.logger.warn(`Unknown import job type: ${job.name}`);
    }
  }

  private async handleProcessFile(data: ProcessFileJobData): Promise<void> {
    const { importId, organizationId, createdById, type, columnMapping } = data;

    // Mark as processing
    await this.prisma.import.update({
      where: { id: importId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Fetch rows from DB (for reprocess) or parse from fileContent
      let rows: ParsedRow[] = [];

      if (!data.reprocess && data.fileContent) {
        rows = this.parseCsvBase64(data.fileContent);

        // Save rows to DB
        await this.prisma.importRow.deleteMany({ where: { importId } });
        await this.prisma.import.update({
          where: { id: importId },
          data: { rowCount: rows.length },
        });

        // Bulk create import rows
        await this.prisma.importRow.createMany({
          data: rows.map((row, idx) => ({
            importId,
            rowNumber: idx + 1,
            rawData: row,
            status: 'pending',
          })),
        });
      } else {
        // Reprocess: load rows from DB
        const dbRows = await this.prisma.importRow.findMany({
          where: { importId },
          orderBy: { rowNumber: 'asc' },
        });
        rows = dbRows.map((r) => r.rawData as ParsedRow);
      }

      // Process each row
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      const dbRowRecords = await this.prisma.importRow.findMany({
        where: { importId },
        orderBy: { rowNumber: 'asc' },
      });

      for (const dbRow of dbRowRecords) {
        const raw = dbRow.rawData as ParsedRow;
        try {
          const mapped = this.applyMapping(raw, columnMapping);

          if (type === 'EXPENSES') {
            const expense = await this.createExpense(
              mapped,
              organizationId,
              createdById,
            );
            await this.prisma.importRow.update({
              where: { id: dbRow.id },
              data: { status: 'success', entityId: expense.id },
            });
          } else if (type === 'PRODUCTS') {
            const product = await this.createProduct(mapped, organizationId);
            await this.prisma.importRow.update({
              where: { id: dbRow.id },
              data: { status: 'success', entityId: product.id },
            });
          } else if (type === 'SERVICES') {
            const service = await this.createService(mapped, organizationId);
            await this.prisma.importRow.update({
              where: { id: dbRow.id },
              data: { status: 'success', entityId: service.id },
            });
          } else {
            const sale = await this.createSale(
              mapped,
              organizationId,
              createdById,
            );
            await this.prisma.importRow.update({
              where: { id: dbRow.id },
              data: { status: 'success', entityId: sale.id },
            });
          }

          successCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          await this.prisma.importRow.update({
            where: { id: dbRow.id },
            data: { status: 'error', errorMsg: msg },
          });
          errors.push(`Row ${dbRow.rowNumber}: ${msg}`);
          errorCount++;
        }
      }

      const finalStatus =
        errorCount === 0
          ? 'COMPLETED'
          : successCount === 0
            ? 'FAILED'
            : 'PARTIAL';

      await this.prisma.import.update({
        where: { id: importId },
        data: {
          status: finalStatus,
          successCount,
          errorCount,
          errorSummary: errors.length ? errors.slice(0, 50).join('\n') : null,
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `Import ${importId} finished: ${successCount} success, ${errorCount} errors`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      this.logger.error(`Import ${importId} failed: ${msg}`);

      await this.prisma.import.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          errorSummary: msg,
          processedAt: new Date(),
        },
      });

      throw err;
    }
  }

  /** Parse base64-encoded CSV into array of row objects */
  private parseCsvBase64(base64: string): ParsedRow[] {
    const csv = Buffer.from(base64, 'base64').toString('utf-8');
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]!);
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]!);
      const row: ParsedRow = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });
      rows.push(row);
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  /** Map raw file row to app field names using columnMapping */
  private applyMapping(
    raw: ParsedRow,
    mapping: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [fileCol, appField] of Object.entries(mapping)) {
      if (raw[fileCol] !== undefined) {
        result[appField] = raw[fileCol];
      }
    }
    return result;
  }

  private async createExpense(
    data: Record<string, string>,
    organizationId: string,
    createdById: string,
  ) {
    if (!data.date) throw new Error('Missing required field: date');
    if (!data.description)
      throw new Error('Missing required field: description');
    if (!data.amount) throw new Error('Missing required field: amount');

    const amount = parseFloat(data.amount.replace(/[^0-9.-]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid amount: ${data.amount}`);
    }

    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${data.date}`);
    }

    // Resolve category: prefer explicit ID, fall back to name (find-or-create)
    let categoryId: string | null = data.categoryId || null;
    if (!categoryId && data.category) {
      const name = data.category.trim();
      let cat = await this.prisma.expenseCategory.findFirst({
        where: { organizationId, name: { equals: name, mode: 'insensitive' } },
      });
      if (!cat) {
        cat = await this.prisma.expenseCategory.create({
          data: { organizationId, name },
        });
      }
      categoryId = cat.id;
    }

    return this.prisma.expense.create({
      data: {
        organizationId,
        createdById,
        description: data.description,
        amount: amount.toFixed(2),
        date,
        categoryId,
        recurrence: (data.recurrence as 'NONE') || 'NONE',
        notes: data.notes || null,
      },
    });
  }

  private async createSale(
    data: Record<string, string>,
    organizationId: string,
    createdById: string,
  ) {
    if (!data.date) throw new Error('Missing required field: date');
    if (!data.unitPrice) throw new Error('Missing required field: unitPrice');

    const unitPrice = parseFloat(data.unitPrice.replace(/[^0-9.-]/g, ''));
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unitPrice: ${data.unitPrice}`);
    }

    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${data.date}`);
    }

    const quantity = data.quantity ? parseFloat(data.quantity) : 1;

    const unitCost = data.unitCost
      ? parseFloat(data.unitCost.replace(/[^0-9.-]/g, ''))
      : null;

    // Resolve product: prefer explicit ID, fall back to name lookup
    let productId: string | null = data.productId || null;
    if (!productId && data.product) {
      const name = data.product.trim();
      const found = await this.prisma.product.findFirst({
        where: { organizationId, name: { equals: name, mode: 'insensitive' } },
      });
      productId = found?.id ?? null;
    }

    return this.prisma.sale.create({
      data: {
        organizationId,
        createdById,
        productId,
        description: data.description || null,
        quantity: quantity.toString(),
        unitPrice: unitPrice.toFixed(2),
        unitCost: unitCost !== null ? unitCost.toFixed(2) : null,
        date,
        recurrence: (data.recurrence as 'NONE') || 'NONE',
        notes: data.notes || null,
      },
    });
  }

  private async createService(
    data: Record<string, string>,
    organizationId: string,
  ) {
    if (!data.name) throw new Error('Missing required field: name');
    if (!data.unitPrice) throw new Error('Missing required field: unitPrice');

    const unitPrice = parseFloat(data.unitPrice.replace(/[^0-9.-]/g, ''));
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unitPrice: ${data.unitPrice}`);
    }

    const unitCost = data.unitCost
      ? parseFloat(data.unitCost.replace(/[^0-9.-]/g, ''))
      : null;

    // Upsert by name so re-imports don't create duplicates
    const existing = await this.prisma.service.findFirst({
      where: { organizationId, name: { equals: data.name.trim(), mode: 'insensitive' } },
    });

    if (existing) {
      return this.prisma.service.update({
        where: { id: existing.id },
        data: {
          unitPrice: unitPrice.toFixed(2),
          ...(unitCost !== null && { unitCost: unitCost.toFixed(2) }),
          ...(data.description && { description: data.description }),
          ...(data.sku && { sku: data.sku }),
          isActive: true,
        },
      });
    }

    return this.prisma.service.create({
      data: {
        organizationId,
        name: data.name.trim(),
        description: data.description || null,
        unitPrice: unitPrice.toFixed(2),
        unitCost: unitCost !== null ? unitCost.toFixed(2) : null,
        sku: data.sku || null,
        isActive: true,
      },
    });
  }

  private async createProduct(
    data: Record<string, string>,
    organizationId: string,
  ) {
    if (!data.name) throw new Error('Missing required field: name');
    if (!data.unitPrice) throw new Error('Missing required field: unitPrice');

    const unitPrice = parseFloat(data.unitPrice.replace(/[^0-9.-]/g, ''));
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unitPrice: ${data.unitPrice}`);
    }

    const unitCost = data.unitCost
      ? parseFloat(data.unitCost.replace(/[^0-9.-]/g, ''))
      : null;

    // Upsert by name so re-imports don't create duplicates
    const existing = await this.prisma.product.findFirst({
      where: {
        organizationId,
        name: { equals: data.name.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      return this.prisma.product.update({
        where: { id: existing.id },
        data: {
          unitPrice: unitPrice.toFixed(2),
          ...(unitCost !== null && { unitCost: unitCost.toFixed(2) }),
          ...(data.description && { description: data.description }),
          ...(data.sku && { sku: data.sku }),
          isActive: true,
        },
      });
    }

    return this.prisma.product.create({
      data: {
        organizationId,
        name: data.name.trim(),
        description: data.description || null,
        unitPrice: unitPrice.toFixed(2),
        unitCost: unitCost !== null ? unitCost.toFixed(2) : null,
        sku: data.sku || null,
        isActive: true,
      },
    });
  }
}
