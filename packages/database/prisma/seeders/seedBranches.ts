import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';
import { SeedPharmacy } from './seedPharmacies';

export interface SeedBranch {
  id: string;
  pharmacyId: string;
  name: string;
}

// Even a single-location pharmacy still gets a branch record (see flow doc).
const MIN_BRANCHES_PER_PHARMACY = 1;
const MAX_BRANCHES_PER_PHARMACY = 3;

export async function seedBranches(
  prisma: PrismaClient,
  pharmacies: SeedPharmacy[],
): Promise<SeedBranch[]> {
  console.log('Seeding branches...');

  const branches: SeedBranch[] = [];

  for (const pharmacy of pharmacies) {
    const branchCount = faker.number.int({
      min: MIN_BRANCHES_PER_PHARMACY,
      max: MAX_BRANCHES_PER_PHARMACY,
    });

    for (let index = 0; index < branchCount; index += 1) {
      const name =
        index === 0 ? 'Main Branch' : `${faker.location.city()} Branch`;

      const branch = await prisma.pharmacyBranch.create({
        data: {
          pharmacyId: pharmacy.id,
          name,
          phoneNumber: faker.phone.number({ style: 'national' }),
          address: faker.location.streetAddress(true),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
        },
        select: { id: true, pharmacyId: true, name: true },
      });

      branches.push(branch);
    }
  }

  console.log(`Branches seeded: ${branches.length} total`);
  return branches;
}
