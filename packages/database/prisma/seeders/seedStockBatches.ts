import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';
import { SeedBranch } from './seedBranches';

const MIN_BATCHES_PER_BRANCH = 5;
const MAX_BATCHES_PER_BRANCH = 12;

function buildBatchNumber() {
  return `BATCH-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`;
}

export async function seedStockBatches(
  prisma: PrismaClient,
  branches: SeedBranch[],
) {
  console.log('Seeding stock batches...');

  const medicineOptions = await prisma.medicine.findMany({
    select: { id: true },
  });

  if (medicineOptions.length === 0 || branches.length === 0) {
    console.log('Stock batches skipped: no medicines or branches to link.');
    return;
  }

  const medicineIds = medicineOptions.map((medicine) => medicine.id);

  const stockBatches = branches.flatMap((branch) => {
    const batchCount = faker.number.int({
      min: MIN_BATCHES_PER_BRANCH,
      max: MAX_BATCHES_PER_BRANCH,
    });

    return Array.from({ length: batchCount }, () => ({
      branchId: branch.id,
      medicineId: faker.helpers.arrayElement(medicineIds),
      batchNumber: buildBatchNumber(),
      quantity: faker.number.int({ min: 0, max: 500 }),
      expiryDate: faker.date.future({ years: 3 }),
    }));
  });

  await prisma.stockBatch.createMany({
    data: stockBatches,
  });

  console.log(`Stock batches seeded: ${stockBatches.length} total`);
}
