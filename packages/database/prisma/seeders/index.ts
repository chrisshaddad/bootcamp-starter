import { prisma } from '../../src/client';
import { seedPlatformInstitution, seedSuperAdmins } from './seedUsers';
import { seedInstitutions } from './seedInstitutions';
import { seedFriendsInstitution } from './seedFriendsInstitution';

async function main() {
  // The platform institution must exist before super admins can reference it
  await seedPlatformInstitution(prisma);
  await seedSuperAdmins(prisma);

  // Each institution is created together with its admin user
  await seedInstitutions(prisma);

  // A single, fully-populated institution for exercising dashboard stats
  await seedFriendsInstitution(prisma);
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
