import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins, seedLibrarians } from './seedUsers';
import { seedOrganizations } from './seedOrganizations';
import { seedCatalog } from './seedCatalog';
import { seedCirculation } from './seedCirculation';
import { seedLibraryMembers } from './seedLibraryMembers';

async function main() {
  // Seed users first (org admins need to exist before organizations)
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);
  await seedLibrarians(prisma);

  // Seed organizations (links org admins to their orgs)
  await seedOrganizations(prisma);

  // Seed catalog data after organizations exist
  await seedCatalog(prisma);

  // Seed library members after organizations exist
  await seedLibraryMembers(prisma);

  // Seed rentals and reservations after members and catalog data exist
  await seedCirculation(prisma);
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
