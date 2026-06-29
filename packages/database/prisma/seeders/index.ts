import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins, seedLibrarians } from './seedUsers';
import { seedOrganizations } from './seedOrganizations';
import { seedLibraryMembers } from './seedLibraryMembers';

async function main() {
  // Seed users first (org admins need to exist before organizations)
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);
  await seedLibrarians(prisma);

  // Seed organizations (links org admins to their orgs)
  await seedOrganizations(prisma);

  // Seed library members after organizations exist
  await seedLibraryMembers(prisma);
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
