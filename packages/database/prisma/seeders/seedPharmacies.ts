import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';

export interface SeedPharmacy {
  id: string;
  name: string;
}

const PHARMACY_COUNT = 3;

export async function seedPharmacies(
  prisma: PrismaClient,
): Promise<SeedPharmacy[]> {
  console.log('Seeding pharmacies...');

  const pharmacies: SeedPharmacy[] = [];
  const pharmacyNames = faker.helpers.uniqueArray(
    () => `${faker.company.name()} Pharmacy`,
    PHARMACY_COUNT,
  );

  for (const name of pharmacyNames) {
    const pharmacy = await prisma.pharmacy.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });

    pharmacies.push({
      id: pharmacy.id,
      name: pharmacy.name,
    });
  }

  console.log(`Pharmacies seeded: ${pharmacies.length} total`);
  return pharmacies;
}
