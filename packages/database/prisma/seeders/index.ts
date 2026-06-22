import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins, seedAttendeeUsers } from './seedUsers';
import { seedOrganizations } from './seedOrganizations';
import { seedCoordly } from './seedCoordly';

async function main() {
  // Seed users first (org admins need to exist before organizations)
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);
  await seedAttendeeUsers(prisma);

  // Seed organizations (links org admins and members to their orgs)
  await seedOrganizations(prisma);

  // Seed Coordly domain data (members and events)
  await seedCoordly(prisma);
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
