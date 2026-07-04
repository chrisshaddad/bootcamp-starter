import { PrismaClient } from '../../src/generated/prisma/client';
import { extractIngredientNames, WORKBOOK_PATH } from './workbookIngredients';
import * as XLSX from 'xlsx';

const BATCH_SIZE = 500;

function truncate(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

export async function seedIngredients(prisma: PrismaClient) {
  console.log('Seeding ingredients from workbook...');

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const sheetName = workbook.SheetNames[0];

  if (sheetName === undefined) {
    throw new Error(`No worksheet found in workbook: ${WORKBOOK_PATH}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | null>>(sheet, {
    defval: null,
    raw: false,
  });

  const workbookIngredientNames: string[] = [];
  const seenNames = new Set<string>();

  for (const row of rows) {
    const ingredientNames = extractIngredientNames(row['Ingredients']);

    for (const name of ingredientNames) {
      if (seenNames.has(name)) {
        continue;
      }

      seenNames.add(name);
      workbookIngredientNames.push(name);
    }
  }

  if (workbookIngredientNames.length === 0) {
    console.log('Ingredients skipped: no valid workbook rows found.');
    return;
  }

  const existingIngredients = await prisma.ingredient.findMany({
    select: { name: true },
  });

  const existingIngredientNames = new Set(
    existingIngredients.map((ingredient) => ingredient.name),
  );

  const ingredientsToInsert = workbookIngredientNames.filter(
    (name) => !existingIngredientNames.has(name),
  );

  if (ingredientsToInsert.length === 0) {
    console.log(
      `Ingredients skipped: ${workbookIngredientNames.length} workbook rows already seeded.`,
    );
    return;
  }

  for (let index = 0; index < ingredientsToInsert.length; index += BATCH_SIZE) {
    await prisma.ingredient.createMany({
      data: ingredientsToInsert.slice(index, index + BATCH_SIZE).map((name) => ({
        name: truncate(name, 200),
      })),
    });
  }

  console.log(
    `Ingredients seeded: ${ingredientsToInsert.length} inserted, ${workbookIngredientNames.length - ingredientsToInsert.length} skipped.`,
  );
}
