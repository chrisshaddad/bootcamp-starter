import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins } from './seedUsers';
import { seedOrganizations } from './seedOrganizations';
import { seedLms } from './seedLm';

async function main() {
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);
  await seedOrganizations(prisma);
  await seedLms(prisma);
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
