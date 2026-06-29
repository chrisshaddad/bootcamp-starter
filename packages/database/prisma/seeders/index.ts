import { prisma } from '../../src/client';
import { seedIngredients } from './seedIngredients';
import { seedMedicines } from './seedMedicines';
import { seedPharmacies } from './seedPharmacies';
import { seedBranches } from './seedBranches';
import { seedUsers } from './seedUsers';
import { seedStockBatches } from './seedStockBatches';
import { seedMedicineIngredients } from './seedMedicineIngredients';
import { seedInquiries } from './seedInquiries';
import { seedInquiryMessages } from './seedInquiryMessages';

// Branches, stock batches, inquiries, and inquiry messages are generated from
// random data with no natural unique key, so they cannot be upserted. Clear
// them first (child-first FK order) to keep the full pipeline rerunnable.
async function resetGeneratedData() {
  console.log('Clearing previously generated seed data...');
  await prisma.inquiryMessage.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.pharmacyBranch.deleteMany();
}

async function main() {
  await resetGeneratedData();

  await seedIngredients(prisma);
  await seedMedicines(prisma);
  await seedMedicineIngredients(prisma);

  const pharmacies = await seedPharmacies(prisma);
  const branches = await seedBranches(prisma, pharmacies);
  await seedUsers(prisma, pharmacies);
  await seedStockBatches(prisma, branches);
  await seedInquiries(prisma, branches);
  await seedInquiryMessages(prisma);
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
