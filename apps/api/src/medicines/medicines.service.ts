import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type {
  MedicineCreateRequest,
  MedicineFacetsResponse,
  MedicineFilter,
  MedicineIngredientOptionsResponse,
  MedicineListQuery,
  MedicineListResponse,
  MedicineResponse,
  MedicineStatsResponse,
  MedicineUpdateRequest,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

// Columns that make up a `MedicineResponse` on the wire. The free-text
// `ingredients` column is parsed into a clean name array by `toResponse`.
const MEDICINE_SELECT = {
  id: true,
  mophId: true,
  atcCode: true,
  brandName: true,
  type: true,
  dosage: true,
  form: true,
  ingredients: true,
  barcode: true,
  priceLbp: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MedicineSelect;

type MedicineRow = Prisma.MedicineGetPayload<{
  select: typeof MEDICINE_SELECT;
}>;

// Parse a medicine's free-text `ingredients` into a clean list of names.
//
// The column is "Name - dosage, Name - dosage", but some medicines store a
// single description that itself contains commas — e.g. a vaccine's serotype
// list "Pneumococcal polysaccharide for serotypes 1, 3, 4, 6A, 11A, 12F, ...".
// A naive comma split shreds that into junk tokens ("11A", "12F", "6A", …).
//
// The tell: those junk pieces all *start with a digit*, whereas a real
// ingredient name starts with a letter. So a comma-piece that begins with a
// digit is treated as a continuation of the previous ingredient, keeping such
// descriptions intact while still splitting ordinary "Name - dosage" lists.
function splitIngredients(text: string | null): string[] {
  if (!text) return [];

  const entries: string[] = [];
  for (const segment of text.split(', ')) {
    const previous = entries[entries.length - 1];
    if (previous !== undefined && /^\d/.test(segment.trimStart())) {
      entries[entries.length - 1] = `${previous}, ${segment}`;
    } else {
      entries.push(segment);
    }
  }

  const names: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const dash = entry.indexOf(' - ');
    const name = (dash === -1 ? entry : entry.slice(0, dash))
      .replace(/\s*-\s*$/, '') // drop a dangling trailing dash
      .trim();
    const key = name.toLowerCase();
    if (name.length > 0 && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

// Normalize a name array for storage in the free-text column: trim, drop
// blanks, dedupe (case-insensitively), and join. Round-trips through
// `splitIngredients` (names never start with a digit, so they don't merge).
function joinIngredients(names: string[]): string | null {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (name.length > 0 && !seen.has(key)) {
      seen.add(key);
      clean.push(name);
    }
  }
  return clean.length > 0 ? clean.join(', ') : null;
}

// `Ingredient.name` is VarChar(200).
const INGREDIENT_NAME_MAX = 200;

// Clean a name array for the `Ingredient` table: trim, truncate to the column
// limit, drop blanks, dedupe (case-insensitively).
function cleanIngredientNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim().slice(0, INGREDIENT_NAME_MAX);
    const key = name.toLowerCase();
    if (name.length > 0 && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

// The seeded `Ingredient` table is polluted with junk fragments from vaccine
// serotype lists ("11A", "12F", "33F …", "2H2O", single letters, "7F,8"). Keep
// only names that look real when offering them as dropdown options: at least two
// characters, not starting with a digit, and no embedded comma.
function isRealIngredientName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && !/^\d/.test(trimmed) && !trimmed.includes(',');
}

@Injectable()
export class MedicinesService {
  private readonly logger = new Logger(MedicinesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Map a row to the wire shape: convert Prisma's Decimal price to a number and
  // parse the free-text ingredients into a clean name array.
  private toResponse(medicine: MedicineRow): MedicineResponse {
    const { ingredients, priceLbp, ...rest } = medicine;
    return {
      ...rest,
      priceLbp: priceLbp === null ? null : priceLbp.toNumber(),
      ingredients: splitIngredients(ingredients),
    };
  }

  // Build the Prisma filter from the shared catalog filters. `ignore` drops one
  // dimension so faceting can compute "what other values are available if this
  // one weren't selected" — the basis for the cascading dropdowns.
  private buildWhere(
    filters: MedicineFilter,
    ignore?: 'type' | 'form' | 'dosage',
  ): Prisma.MedicineWhereInput {
    const and: Prisma.MedicineWhereInput[] = [];

    if (filters.search) {
      and.push({
        OR: [
          { brandName: { contains: filters.search, mode: 'insensitive' } },
          { ingredients: { contains: filters.search, mode: 'insensitive' } },
          { barcode: { contains: filters.search, mode: 'insensitive' } },
          { mophId: { contains: filters.search, mode: 'insensitive' } },
          { atcCode: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }
    if (filters.type && ignore !== 'type') and.push({ type: filters.type });
    if (filters.form && ignore !== 'form') and.push({ form: filters.form });
    if (filters.dosage && ignore !== 'dosage') {
      and.push({ dosage: filters.dosage });
    }
    if (filters.hasPrice === 'true') and.push({ priceLbp: { not: null } });
    if (filters.hasPrice === 'false') and.push({ priceLbp: null });
    if (filters.hasBarcode === 'true') and.push({ barcode: { not: null } });
    if (filters.hasBarcode === 'false') and.push({ barcode: null });

    return and.length > 0 ? { AND: and } : {};
  }

  /**
   * Paginated catalog listing for the super-admin console. Medicines are global
   * (not tenant-scoped), so no scope filter applies. `search` matches brand
   * name, barcode, and ingredients case-insensitively.
   */
  async list(query: MedicineListQuery): Promise<MedicineListResponse> {
    const { page, pageSize, ...filters } = query;
    const where = this.buildWhere(filters);

    // Count + page slice in one round-trip. `id` is a deterministic tie-breaker
    // so rows keep a stable order across pages when brand names collide.
    const [total, medicines] = await this.prisma.$transaction([
      this.prisma.medicine.count({ where }),
      this.prisma.medicine.findMany({
        where,
        select: MEDICINE_SELECT,
        orderBy: [{ brandName: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      medicines: medicines.map((medicine) => this.toResponse(medicine)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Distinct filter values for the cascading dropdowns. Each dimension is
   * computed while ignoring its own current selection, so choosing a form
   * narrows the available dosages and types to what's compatible.
   */
  async facets(filters: MedicineFilter): Promise<MedicineFacetsResponse> {
    const [types, forms, dosages] = await this.prisma.$transaction([
      this.prisma.medicine.groupBy({
        by: ['type'],
        where: this.buildWhere(filters, 'type'),
        orderBy: { type: 'asc' },
      }),
      this.prisma.medicine.groupBy({
        by: ['form'],
        where: this.buildWhere(filters, 'form'),
        orderBy: { form: 'asc' },
      }),
      this.prisma.medicine.groupBy({
        by: ['dosage'],
        where: this.buildWhere(filters, 'dosage'),
        orderBy: { dosage: 'asc' },
      }),
    ]);

    const clean = (values: (string | null)[]): string[] =>
      values.filter(
        (value): value is string => value !== null && value.length > 0,
      );

    return {
      types: clean(types.map((row) => row.type)),
      forms: clean(forms.map((row) => row.form)),
      dosages: clean(dosages.map((row) => row.dosage)),
    };
  }

  /**
   * Ingredient names for the multi-select combobox, taken from the `Ingredient`
   * table's `name` column. The seeded junk fragments are filtered out so the
   * dropdown stays clean; anything not listed can still be typed and is created
   * on save.
   */
  async ingredientOptions(): Promise<MedicineIngredientOptionsResponse> {
    const rows = await this.prisma.ingredient.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return {
      ingredients: rows
        .map((row) => row.name)
        .filter((name) => isRealIngredientName(name)),
    };
  }

  /**
   * Catalog-wide aggregate counts for the summary cards. Runs across the whole
   * catalog (independent of paging/search) so the numbers are always accurate.
   */
  async stats(): Promise<MedicineStatsResponse> {
    const [total, priced, withBarcode] = await this.prisma.$transaction([
      this.prisma.medicine.count(),
      this.prisma.medicine.count({ where: { priceLbp: { not: null } } }),
      this.prisma.medicine.count({ where: { barcode: { not: null } } }),
    ]);
    return { total, priced, withBarcode };
  }

  /**
   * Reconcile the `Ingredient` table and this medicine's `MedicineIngredient`
   * links to exactly the given (clean) names — creating any ingredients that
   * don't exist yet. Runs inside the caller's transaction. Names come from the
   * form (picked from the table or typed), so no junk is written.
   */
  private async syncIngredients(
    tx: Prisma.TransactionClient,
    medicineId: string,
    names: string[],
  ): Promise<void> {
    const clean = cleanIngredientNames(names);

    // Create any missing ingredients with ON CONFLICT DO NOTHING
    // (skipDuplicates), then read the ids back. This is race-safe: a per-name
    // upsert does a find-then-insert that isn't atomic across transactions, so
    // two concurrent creates of the same brand-new name can collide on the
    // unique constraint and leak a raw P2002. A single skip-duplicates insert
    // can't — the database resolves the conflict silently.
    const ingredientIds: string[] = [];
    if (clean.length > 0) {
      await tx.ingredient.createMany({
        data: clean.map((name) => ({ name })),
        skipDuplicates: true,
      });
      const ingredients = await tx.ingredient.findMany({
        where: { name: { in: clean } },
        select: { id: true },
      });
      ingredientIds.push(...ingredients.map((ingredient) => ingredient.id));
    }

    await tx.medicineIngredient.deleteMany({ where: { medicineId } });
    if (ingredientIds.length > 0) {
      await tx.medicineIngredient.createMany({
        data: ingredientIds.map((ingredientId) => ({
          medicineId,
          ingredientId,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Create a medicine. Ingredient names are stored both in the medicine's
   * free-text column (for display/search) and as real `Ingredient` rows +
   * `MedicineIngredient` links, all in one transaction. Barcode uniqueness is
   * enforced by the database.
   */
  async create(dto: MedicineCreateRequest): Promise<MedicineResponse> {
    const { ingredients, ...scalars } = dto;
    try {
      const medicine = await this.prisma.$transaction(async (tx) => {
        const created = await tx.medicine.create({
          data: { ...scalars, ingredients: joinIngredients(ingredients) },
          select: MEDICINE_SELECT,
        });
        await this.syncIngredients(tx, created.id, ingredients);
        return created;
      });
      return this.toResponse(medicine);
    } catch (error) {
      throw this.mapBarcodeConflict(error);
    }
  }

  /**
   * Update a medicine. Any subset of fields may change, including barcode. When
   * `ingredients` is provided, the free-text column, the `Ingredient` rows, and
   * the `MedicineIngredient` links are all updated together in one transaction.
   */
  async update(
    id: string,
    dto: MedicineUpdateRequest,
  ): Promise<MedicineResponse> {
    const existing = await this.prisma.medicine.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Medicine not found.');
    }

    const { ingredients, ...scalars } = dto;
    try {
      const medicine = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.medicine.update({
          where: { id },
          data: {
            ...scalars,
            ...(ingredients !== undefined
              ? { ingredients: joinIngredients(ingredients) }
              : {}),
          },
          select: MEDICINE_SELECT,
        });
        if (ingredients !== undefined) {
          await this.syncIngredients(tx, id, ingredients);
        }
        return updated;
      });
      return this.toResponse(medicine);
    } catch (error) {
      throw this.mapBarcodeConflict(error);
    }
  }

  /**
   * Permanently delete a medicine. This cascades to its stock batches,
   * inquiries, and ingredient links (see the schema's `onDelete: Cascade`).
   */
  async remove(id: string): Promise<MedicineResponse> {
    const existing = await this.prisma.medicine.findUnique({
      where: { id },
      select: MEDICINE_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Medicine not found.');
    }

    await this.prisma.medicine.delete({ where: { id } });
    return this.toResponse(existing);
  }

  // A duplicate barcode trips the unique constraint (P2002); surface it as a
  // clean conflict instead of a raw Prisma error. Only the barcode constraint is
  // mapped — any other P2002 is rethrown.
  private mapBarcodeConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const targetText = Array.isArray(target)
        ? target.join(',')
        : typeof target === 'string'
          ? target
          : '';
      if (targetText.includes('barcode')) {
        return new ConflictException(
          'A medicine with this barcode already exists.',
        );
      }
    }
    return error;
  }
}
