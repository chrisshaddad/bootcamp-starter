import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins } from './seedUsers';
import { seedOrganizations } from './seedOrganizations';
import { seedDepartments } from './seedDepartments';
import { seedSkills } from './seedSkills';
import { seedEmployees } from './seedEmployees';
import { seedOpportunities } from './seedOpportunities';
import { seedApplications } from './seedApplications';

async function main() {
  // 1. Seed users first (org admins need to exist before organizations)
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);

  // 2. Seed organizations (links org admins to their orgs)
  await seedOrganizations(prisma);

  // 3. Seed departments (needs orgs)
  await seedDepartments(prisma);

  // 4. Seed skills (needs orgs)
  await seedSkills(prisma);

  // 5. Seed employees (needs orgs, departments, skills)
  await seedEmployees(prisma);

  // 6. Seed opportunities (needs orgs, departments, skills, hiring managers)
  await seedOpportunities(prisma);

  // 7. Seed applications (needs employees, opportunities)
  await seedApplications(prisma);
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
