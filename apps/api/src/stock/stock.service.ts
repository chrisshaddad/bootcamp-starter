import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { User } from '@repo/db';
import type {
  MedicineCreateRequest,
  StockBatchCreateRequest,
  StockBatchResponse,
  StockBatchUpdateRequest,
  StockBranchOptionsResponse,
  StockCatalogItem,
  StockCatalogQuery,
  StockCatalogResponse,
  StockListQuery,
  StockListResponse,
  StockAttributesResponse,
  StockMedicineDetailResponse,
  StockMedicineSummary,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { MedicinesService } from '../medicines/medicines.service';
import { AuditService } from '../audit/audit.service';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditChanges,
} from '../audit/audit.constants';

// Enough of the global catalog to identify a medicine in the stock views.
const CATALOG_SELECT = {
  id: true,
  brandName: true,
  form: true,
  dosage: true,
  barcode: true,
} satisfies Prisma.MedicineSelect;

// Columns that make up a `StockBatchResponse`.
const BATCH_SELECT = {
  id: true,
  branchId: true,
  medicineId: true,
  batchNumber: true,
  quantity: true,
  expiryDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StockBatchSelect;

type BatchRow = Prisma.StockBatchGetPayload<{ select: typeof BATCH_SELECT }>;

// A calendar date compared/stored as YYYY-MM-DD (the `@db.Date` granularity).
function toDateKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

// The seeded `Ingredient` table carries junk fragments from vaccine serotype
// lists ("11A", "7F,8", single letters). Keep only names that look real when
// offering them as options (mirrors MedicinesService.ingredientOptions).
function isRealIngredientName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && !/^\d/.test(trimmed) && !trimmed.includes(',');
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly medicines: MedicinesService,
    private readonly audit: AuditService,
  ) {}

  private isAdmin(actor: User): boolean {
    return actor.role === 'PHARMACY_ADMIN';
  }

  /**
   * Resolve the branch a WRITE targets — strict. A PHARMACY_ADMIN must name a
   * branch that belongs to their pharmacy; a STOCK_MANAGER always writes to their
   * own branch and the request body's branchId is ignored. The returned id is the
   * only tenant boundary trusted downstream — never the raw request value.
   */
  private async resolveWriteBranch(
    actor: User,
    requestedBranchId?: string,
  ): Promise<string> {
    if (this.isAdmin(actor)) {
      if (!actor.pharmacyId) {
        throw new ForbiddenException(
          'Your account is not attached to a pharmacy.',
        );
      }
      if (!requestedBranchId) {
        throw new BadRequestException('Select a branch.');
      }
      const branch = await this.prisma.pharmacyBranch.findFirst({
        where: { id: requestedBranchId, pharmacyId: actor.pharmacyId },
        select: { id: true },
      });
      if (!branch) {
        throw new BadRequestException(
          'Selected branch does not belong to your pharmacy.',
        );
      }
      return branch.id;
    }

    if (!actor.branchId) {
      throw new ForbiddenException('Your account is not attached to a branch.');
    }
    return actor.branchId;
  }

  /**
   * Resolve the branch a READ targets — lenient. A PHARMACY_ADMIN may pass a
   * branch (re-checked against their pharmacy) or omit it to default to their
   * first branch. Returns null only when an admin has no branches yet. A
   * STOCK_MANAGER always reads their own branch.
   */
  private async resolveReadBranch(
    actor: User,
    requestedBranchId?: string,
  ): Promise<{ id: string; name: string } | null> {
    if (this.isAdmin(actor)) {
      if (!actor.pharmacyId) {
        throw new ForbiddenException(
          'Your account is not attached to a pharmacy.',
        );
      }
      if (requestedBranchId) {
        const branch = await this.prisma.pharmacyBranch.findFirst({
          where: { id: requestedBranchId, pharmacyId: actor.pharmacyId },
          select: { id: true, name: true },
        });
        if (!branch) {
          throw new BadRequestException(
            'Selected branch does not belong to your pharmacy.',
          );
        }
        return branch;
      }
      return this.prisma.pharmacyBranch.findFirst({
        where: { pharmacyId: actor.pharmacyId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
    }

    if (!actor.branchId) {
      throw new ForbiddenException('Your account is not attached to a branch.');
    }
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id: actor.branchId },
      select: { id: true, name: true },
    });
    if (!branch) {
      throw new ForbiddenException('Your branch could not be found.');
    }
    return branch;
  }

  /** Branches the caller may view/manage stock for (for the branch picker). */
  async branchOptions(actor: User): Promise<StockBranchOptionsResponse> {
    if (this.isAdmin(actor)) {
      if (!actor.pharmacyId) {
        throw new ForbiddenException(
          'Your account is not attached to a pharmacy.',
        );
      }
      return this.prisma.pharmacyBranch.findMany({
        where: { pharmacyId: actor.pharmacyId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
    }

    if (!actor.branchId) {
      throw new ForbiddenException('Your account is not attached to a branch.');
    }
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id: actor.branchId },
      select: { id: true, name: true },
    });
    return branch ? [branch] : [];
  }

  /**
   * Per-branch inventory: every medicine held at the resolved branch, with its
   * batches rolled up (total quantity, batch count, nearest expiry). `search`
   * narrows by medicine name/barcode. Scoped strictly to the resolved branchId.
   */
  async list(query: StockListQuery, actor: User): Promise<StockListResponse> {
    const branch = await this.resolveReadBranch(actor, query.branchId);
    if (!branch) {
      return { branchId: null, branchName: null, medicines: [], total: 0 };
    }

    const groups = await this.prisma.stockBatch.groupBy({
      by: ['medicineId'],
      where: { branchId: branch.id },
      _sum: { quantity: true },
      _count: { _all: true },
      _min: { expiryDate: true },
    });
    if (groups.length === 0) {
      return {
        branchId: branch.id,
        branchName: branch.name,
        medicines: [],
        total: 0,
      };
    }

    const search = query.search?.trim();
    const medicines = await this.prisma.medicine.findMany({
      where: {
        id: { in: groups.map((group) => group.medicineId) },
        ...(search
          ? {
              OR: [
                { brandName: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: CATALOG_SELECT,
    });
    const medicineById = new Map(medicines.map((med) => [med.id, med]));

    const summaries: StockMedicineSummary[] = groups
      .filter((group) => medicineById.has(group.medicineId))
      .map((group) => {
        const medicine = medicineById.get(group.medicineId)!;
        return {
          medicineId: medicine.id,
          brandName: medicine.brandName,
          form: medicine.form,
          dosage: medicine.dosage,
          barcode: medicine.barcode,
          totalQuantity: group._sum.quantity ?? 0,
          batchCount: group._count._all,
          nearestExpiry: group._min.expiryDate ?? null,
        };
      })
      .sort((a, b) => a.brandName.localeCompare(b.brandName));

    return {
      branchId: branch.id,
      branchName: branch.name,
      medicines: summaries,
      total: summaries.length,
    };
  }

  /** Every batch of one medicine at the resolved branch, with the running total. */
  async medicineDetail(
    medicineId: string,
    requestedBranchId: string | undefined,
    actor: User,
  ): Promise<StockMedicineDetailResponse> {
    const branch = await this.resolveReadBranch(actor, requestedBranchId);
    if (!branch) {
      throw new NotFoundException('No branch is available for your account.');
    }

    const medicine = await this.prisma.medicine.findUnique({
      where: { id: medicineId },
      select: CATALOG_SELECT,
    });
    if (!medicine) {
      throw new NotFoundException('Medicine not found.');
    }

    const batches = await this.prisma.stockBatch.findMany({
      where: { branchId: branch.id, medicineId },
      orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
      select: BATCH_SELECT,
    });

    return {
      branchId: branch.id,
      branchName: branch.name,
      medicine,
      totalQuantity: batches.reduce((sum, batch) => sum + batch.quantity, 0),
      batches,
    };
  }

  /**
   * Medicine picker for "add batch": exact barcode lookup (scan) or free-text
   * search over the global catalog. The catalog is platform-wide, so there is no
   * tenant scope here — access is limited to stock roles by the controller.
   */
  async catalog(query: StockCatalogQuery): Promise<StockCatalogResponse> {
    if (query.barcode) {
      const medicine = await this.prisma.medicine.findFirst({
        where: { barcode: query.barcode },
        select: CATALOG_SELECT,
      });
      return { medicines: medicine ? [medicine] : [] };
    }

    const search = query.search?.trim();
    if (!search) {
      return { medicines: [] };
    }
    const medicines = await this.prisma.medicine.findMany({
      where: {
        OR: [
          { brandName: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ brandName: 'asc' }, { id: 'asc' }],
      take: 20,
      select: CATALOG_SELECT,
    });
    return { medicines };
  }

  /**
   * Distinct medicine attribute values already in the catalog, for the "pick
   * existing or type new" comboboxes on the add-medicine form. The catalog is
   * global, so there is no tenant scope — access is gated to stock roles by the
   * controller.
   */
  async attributes(): Promise<StockAttributesResponse> {
    const [forms, dosages, types, ingredients] = await this.prisma.$transaction(
      [
        this.prisma.medicine.groupBy({
          by: ['form'],
          orderBy: { form: 'asc' },
        }),
        this.prisma.medicine.groupBy({
          by: ['dosage'],
          orderBy: { dosage: 'asc' },
        }),
        this.prisma.medicine.groupBy({
          by: ['type'],
          orderBy: { type: 'asc' },
        }),
        this.prisma.ingredient.findMany({
          select: { name: true },
          orderBy: { name: 'asc' },
        }),
      ],
    );

    const clean = (values: (string | null)[]): string[] =>
      values.filter(
        (value): value is string => value !== null && value.length > 0,
      );

    return {
      forms: clean(forms.map((row) => row.form)),
      dosages: clean(dosages.map((row) => row.dosage)),
      types: clean(types.map((row) => row.type)),
      ingredients: ingredients
        .map((row) => row.name)
        .filter((name) => isRealIngredientName(name)),
    };
  }

  /**
   * Register a new medicine in the global catalog (the barcode-not-found path).
   * Delegates to MedicinesService so barcode-conflict handling, ingredient sync,
   * and the MEDICINE_CREATE audit entry are all reused rather than duplicated.
   */
  async createCatalogMedicine(
    dto: MedicineCreateRequest,
    actor: User,
  ): Promise<StockCatalogItem> {
    const created = await this.medicines.create(dto, actor.id);
    return {
      id: created.id,
      brandName: created.brandName,
      form: created.form,
      dosage: created.dosage,
      barcode: created.barcode,
    };
  }

  /** Add a batch to the caller's (resolved) branch. */
  async createBatch(
    dto: StockBatchCreateRequest,
    actor: User,
  ): Promise<StockBatchResponse> {
    const branchId = await this.resolveWriteBranch(actor, dto.branchId);

    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
      select: { id: true, brandName: true },
    });
    if (!medicine) {
      throw new BadRequestException('Selected medicine does not exist.');
    }

    const created = await this.prisma.stockBatch.create({
      data: {
        branchId,
        medicineId: dto.medicineId,
        batchNumber: dto.batchNumber ?? null,
        quantity: dto.quantity,
        expiryDate: new Date(dto.expiryDate),
      },
      select: BATCH_SELECT,
    });

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.STOCK_BATCH_CREATE,
      entity: AUDIT_ENTITIES.STOCK_BATCH,
      entityId: created.id,
      details: {
        branchId,
        medicineId: created.medicineId,
        brandName: medicine.brandName,
        batchNumber: created.batchNumber,
        quantity: created.quantity,
        expiryDate: toDateKey(created.expiryDate),
      },
    });

    return created;
  }

  /** Edit a batch's quantity, expiry, or lot number. */
  async updateBatch(
    id: string,
    dto: StockBatchUpdateRequest,
    actor: User,
  ): Promise<StockBatchResponse> {
    const batch = await this.loadAccessibleBatch(id, actor);

    const data: Prisma.StockBatchUncheckedUpdateInput = {};
    if (dto.batchNumber !== undefined) data.batchNumber = dto.batchNumber;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.expiryDate !== undefined)
      data.expiryDate = new Date(dto.expiryDate);

    // Scope the mutation itself by branchId, so the tenant boundary is enforced
    // on the write — not just the accessibility check above.
    await this.prisma.stockBatch.updateMany({
      where: { id, branchId: batch.branchId },
      data,
    });
    const updated = await this.prisma.stockBatch.findFirstOrThrow({
      where: { id, branchId: batch.branchId },
      select: BATCH_SELECT,
    });

    const changes: AuditChanges = {};
    if (dto.quantity !== undefined && dto.quantity !== batch.quantity) {
      changes.quantity = { from: batch.quantity, to: dto.quantity };
    }
    if (
      dto.expiryDate !== undefined &&
      toDateKey(batch.expiryDate) !== toDateKey(updated.expiryDate)
    ) {
      changes.expiryDate = {
        from: toDateKey(batch.expiryDate),
        to: toDateKey(updated.expiryDate),
      };
    }
    if (
      dto.batchNumber !== undefined &&
      dto.batchNumber !== batch.batchNumber
    ) {
      changes.batchNumber = { from: batch.batchNumber, to: dto.batchNumber };
    }

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.STOCK_BATCH_UPDATE,
      entity: AUDIT_ENTITIES.STOCK_BATCH,
      entityId: id,
      details: { medicineId: updated.medicineId, changes },
    });

    return updated;
  }

  /** Delete a batch. The medicine's running total recomputes from the rest. */
  async deleteBatch(id: string, actor: User): Promise<StockBatchResponse> {
    const batch = await this.loadAccessibleBatch(id, actor);

    await this.prisma.stockBatch.deleteMany({
      where: { id, branchId: batch.branchId },
    });

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.STOCK_BATCH_DELETE,
      entity: AUDIT_ENTITIES.STOCK_BATCH,
      entityId: id,
      details: {
        branchId: batch.branchId,
        medicineId: batch.medicineId,
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
      },
    });

    return batch;
  }

  /**
   * Load a batch and confirm the caller may touch it: a STOCK_MANAGER only their
   * own branch's batches; a PHARMACY_ADMIN only batches whose branch belongs to
   * their pharmacy. A miss is reported as 404 (never leaking existence across
   * tenants).
   */
  private async loadAccessibleBatch(
    id: string,
    actor: User,
  ): Promise<BatchRow> {
    const batch = await this.prisma.stockBatch.findUnique({
      where: { id },
      select: { ...BATCH_SELECT, branch: { select: { pharmacyId: true } } },
    });
    if (!batch) {
      throw new NotFoundException('Stock batch not found.');
    }

    if (this.isAdmin(actor)) {
      if (!actor.pharmacyId || batch.branch.pharmacyId !== actor.pharmacyId) {
        throw new NotFoundException('Stock batch not found.');
      }
    } else if (!actor.branchId || batch.branchId !== actor.branchId) {
      throw new NotFoundException('Stock batch not found.');
    }

    const { branch: _branch, ...row } = batch;
    return row;
  }
}
