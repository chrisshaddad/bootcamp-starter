import { prisma } from '../../src/client';
import { seedIngredients } from './seedIngredients';
import { seedMedicines } from './seedMedicines';
import { seedPharmacies } from './seedPharmacies';
import { seedUsers } from './seedUsers';

async function main() {
  await seedIngredients(prisma);
  await seedMedicines(prisma);

  const pharmacies = await seedPharmacies(prisma);
  await seedUsers(prisma, pharmacies);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
