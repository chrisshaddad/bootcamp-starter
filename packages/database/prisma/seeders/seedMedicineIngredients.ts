import { PrismaClient } from '../../src/generated/prisma/client';

export async function seedMedicineIngredients(prisma: PrismaClient) {
  console.log('Seeding medicine ingredients...');

  const [medicines, ingredients] = await Promise.all([
    prisma.medicine.findMany({ select: { id: true, ingredients: true } }),
    prisma.ingredient.findMany({ select: { id: true, name: true } }),
  ]);

  if (medicines.length === 0 || ingredients.length === 0) {
    console.log(
      'Medicine ingredients skipped: no medicines or ingredients to link.',
    );
    return;
  }

  // Mirror the join table from the comma-separated ingredients text that
  // seedMedicines already wrote per medicine, so both representations agree.
  const ingredientIdByName = new Map(
    ingredients.map((ingredient) => [ingredient.name, ingredient.id]),
  );

  const links = medicines.flatMap((medicine) =>
    (medicine.ingredients ?? '')
      .split(',')
      .map((name) => ingredientIdByName.get(name.trim()))
      .filter((ingredientId): ingredientId is string => Boolean(ingredientId))
      .map((ingredientId) => ({
        medicineId: medicine.id,
        ingredientId,
      })),
  );

  await prisma.medicineIngredient.createMany({
    data: links,
    skipDuplicates: true,
  });

  console.log(`Medicine ingredients seeded: ${links.length} total`);
}
