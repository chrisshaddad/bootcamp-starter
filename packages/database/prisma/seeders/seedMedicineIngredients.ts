import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';

const MIN_INGREDIENTS_PER_MEDICINE = 1;
const MAX_INGREDIENTS_PER_MEDICINE = 4;

export async function seedMedicineIngredients(prisma: PrismaClient) {
  console.log('Seeding medicine ingredients...');

  const [medicines, ingredients] = await Promise.all([
    prisma.medicine.findMany({ select: { id: true } }),
    prisma.ingredient.findMany({ select: { id: true } }),
  ]);

  if (medicines.length === 0 || ingredients.length === 0) {
    console.log(
      'Medicine ingredients skipped: no medicines or ingredients to link.',
    );
    return;
  }

  const ingredientIds = ingredients.map((ingredient) => ingredient.id);

  const links = medicines.flatMap((medicine) => {
    const count = faker.number.int({
      min: MIN_INGREDIENTS_PER_MEDICINE,
      max: Math.min(MAX_INGREDIENTS_PER_MEDICINE, ingredientIds.length),
    });

    const selected = faker.helpers.arrayElements(ingredientIds, count);

    return selected.map((ingredientId) => ({
      medicineId: medicine.id,
      ingredientId,
    }));
  });

  await prisma.medicineIngredient.createMany({
    data: links,
    skipDuplicates: true,
  });

  console.log(`Medicine ingredients seeded: ${links.length} total`);
}
