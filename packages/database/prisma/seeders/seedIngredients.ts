import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';

const INGREDIENT_COUNT = 30;

function buildIngredientNames() {
  return faker.helpers.uniqueArray(
    () => `${faker.word.adjective()} ${faker.word.noun()}`,
    INGREDIENT_COUNT,
  );
}

export async function seedIngredients(prisma: PrismaClient) {
  console.log('Seeding ingredients...');

  const ingredientNames = buildIngredientNames();

  await prisma.ingredient.createMany({
    data: ingredientNames.map((name) => ({
      name: name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    })),
    skipDuplicates: true,
  });

  console.log(`Ingredients seeded: ${ingredientNames.length} total`);
}
