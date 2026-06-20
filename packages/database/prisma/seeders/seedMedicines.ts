import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';

const MEDICINE_COUNT = 40;

const MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Cream',
  'Drops',
  'Injection',
];
const MEDICINE_FORMS = [
  'Tablet',
  'Capsule',
  'Oral Solution',
  'Topical Cream',
  'Eye Drops',
  'Ampoule',
];

function buildBrandName() {
  return `${faker.word.adjective()} ${faker.word.noun()} ${faker.word.noun()}`;
}

function buildBarcode(index: number) {
  return faker.string.numeric(12 - String(index).length) + String(index);
}

function buildIngredientList() {
  const count = faker.number.int({ min: 1, max: 4 });
  return faker.helpers.uniqueArray(
    () => `${faker.word.adjective()} ${faker.word.noun()}`,
    count,
  );
}

function pickRandomIngredients(ingredientNames: string[]) {
  const count = faker.number.int({
    min: 1,
    max: Math.min(4, ingredientNames.length),
  });
  const selected = new Set<string>();

  while (selected.size < count) {
    selected.add(faker.helpers.arrayElement(ingredientNames));
  }

  return Array.from(selected);
}

export async function seedMedicines(prisma: PrismaClient) {
  console.log('Seeding medicines...');

  const ingredientOptions = await prisma.ingredient.findMany({
    select: { name: true },
  });

  const medicines = Array.from({ length: MEDICINE_COUNT }, (_, index) => {
    const ingredientList =
      ingredientOptions.length > 0
        ? pickRandomIngredients(
            ingredientOptions.map((ingredient) => ingredient.name),
          )
        : buildIngredientList();

    return {
      mophId: `MOPH-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
      atcCode: `A${faker.string.alphanumeric({ length: 4, casing: 'upper' })}`,
      brandName: `${buildBrandName()} ${index + 1}`,
      type: faker.helpers.arrayElement(MEDICINE_TYPES),
      dosage: `${faker.number.int({ min: 1, max: 1000 })} mg`,
      form: faker.helpers.arrayElement(MEDICINE_FORMS),
      ingredients: ingredientList.join(', '),
      barcode: buildBarcode(index + 1),
      priceLbp: faker.number.float({
        min: 5000,
        max: 250000,
        fractionDigits: 2,
      }),
    };
  });

  await prisma.medicine.createMany({
    data: medicines,
    skipDuplicates: true,
  });

  console.log(`Medicines seeded: ${medicines.length} total`);
}
