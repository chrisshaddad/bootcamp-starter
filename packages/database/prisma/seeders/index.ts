import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins } from './seedUsers';
import { seedOrganizations } from './seedOrganizations';
import { seedLms } from './seedLms';

async function main() {
  // 1. Seed users first
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);

  // 2. Seed organizations after users
  await seedOrganizations(prisma);

  // 3. Seed LMS data after users and organizations exist
  await seedLms(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
