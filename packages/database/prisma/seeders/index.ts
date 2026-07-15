import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins } from './seedUsers';
import { seedOrganizations } from './seedOrganizations';
import { seedSkills } from './seedSkills';
import { seedEmployees } from './seedEmployees';
import { seedOpportunities } from './seedOpportunities';

async function main() {
  // 1. Seed users first (org admins need to exist before organizations)
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);

  // 2. Seed organizations (links org admins to their orgs)
  await seedOrganizations(prisma);

  // Seed mobility data for TechCorp Solutions (skills before employees before opportunities)
  await seedSkills(prisma);
  await seedEmployees(prisma);
  await seedOpportunities(prisma);
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
