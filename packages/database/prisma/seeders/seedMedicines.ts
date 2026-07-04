import * as XLSX from 'xlsx';
import { PrismaClient } from '../../src/generated/prisma/client';

// Prisma runs this seed from packages/database, so this path resolves from that cwd.
const WORKBOOK_PATH = '../moph_drugs.xlsx';
const BATCH_SIZE = 500;

type MedicineSheetRow = Record<string, string | number | null>;

type SeedMedicine = {
  mophId: string;
  atcCode: string | null;
  brandName: string;
  type: string | null;
  ingredients: string | null;
  dosage: string | null;
  form: string | null;
  priceLbp: string | null;
};

function normalizeCell(value: string | number | null): string | null {
  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function truncate(value: string | null, maxLength: number): string | null {
  if (value === null) {
    return null;
  }

  return value.slice(0, maxLength);
}

function normalizePrice(value: string | number | null): string | null {
  const normalized = normalizeCell(value);
  if (normalized === null) {
    return null;
  }

  // Strip commas, currency labels, whitespace, etc. Keep only digits and a decimal point.
  const cleaned = normalized
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '')
    .trim();

  if (cleaned.length === 0 || !/^\d+(\.\d+)?$/.test(cleaned)) {
    // Unparseable (e.g. "N/A", "1000-1500", "L.L. 500") — store null instead of
    // sending an invalid value to the Decimal column and crashing the whole batch.
    return null;
  }

  return cleaned;
}

function buildMedicineSeed(row: MedicineSheetRow): SeedMedicine | null {
  const mophId = truncate(normalizeCell(row['ID']), 100);
  const brandName = truncate(normalizeCell(row['Brand Name']), 200);

  if (mophId === null || brandName === null) {
    return null;
  }

  return {
    mophId,
    atcCode: truncate(normalizeCell(row['ATC Code']), 20),
    brandName,
    type: truncate(normalizeCell(row['B/G']), 20),
    ingredients: normalizeCell(row['Ingredients']),
    dosage: truncate(normalizeCell(row['Dosage']), 100),
    form: truncate(normalizeCell(row['Form']), 50),
    priceLbp: normalizePrice(row['Price (L.L)']),
  };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function seedMedicines(prisma: PrismaClient) {
  console.log('Seeding medicines from workbook...');

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const sheetName = workbook.SheetNames[0];

  if (sheetName === undefined) {
    throw new Error(`No worksheet found in workbook: ${WORKBOOK_PATH}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<MedicineSheetRow>(sheet, {
    defval: null,
    raw: false,
  });

  const workbookMedicines: SeedMedicine[] = [];
  const seenMophIds = new Set<string>();
  let skippedPriceCount = 0;

  for (const row of rows) {
    const medicine = buildMedicineSeed(row);

    if (medicine === null || seenMophIds.has(medicine.mophId)) {
      continue;
    }

    if (medicine.priceLbp === null && row['Price (L.L)'] !== null) {
      skippedPriceCount += 1;
      console.log(
        `Unparseable price for mophId ${medicine.mophId}: ${JSON.stringify(row['Price (L.L)'])}`,
      );
    }

    seenMophIds.add(medicine.mophId);
    workbookMedicines.push(medicine);
  }

  if (workbookMedicines.length === 0) {
    console.log('Medicines skipped: no valid workbook rows found.');
    return;
  }

  const existingMedicines = await prisma.medicine.findMany({
    select: { mophId: true },
    where: { mophId: { not: null } },
  });

  const existingMophIds = new Set(
    existingMedicines.map((medicine) => medicine.mophId as string),
  );

  const medicinesToInsert = workbookMedicines.filter(
    (medicine) => !existingMophIds.has(medicine.mophId),
  );

  if (medicinesToInsert.length === 0) {
    console.log(
      `Medicines skipped: ${workbookMedicines.length} workbook rows already seeded.`,
    );
    return;
  }

  for (const batch of chunk(medicinesToInsert, BATCH_SIZE)) {
    await prisma.medicine.createMany({
      data: batch,
    });
  }

  console.log(
    `Medicines seeded: ${medicinesToInsert.length} inserted, ${workbookMedicines.length - medicinesToInsert.length} skipped.`,
  );

  if (skippedPriceCount > 0) {
    console.log(
      `Note: ${skippedPriceCount} rows had an unparseable price and were seeded with priceLbp = null.`,
    );
  }
}
