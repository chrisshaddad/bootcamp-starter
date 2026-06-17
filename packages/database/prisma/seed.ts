import { PrismaClient } from '../src/generated/prisma/client';
import { seedSuperAdmins, seedOrgAdmins } from './seeders/seedUsers';
import { seedOrganizations } from './seeders/seedOrganizations';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);
  await seedOrganizations(prisma);
  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
