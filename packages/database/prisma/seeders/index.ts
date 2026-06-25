import { prisma } from '../../src/client';
import { seedUsers } from './seedUsers';
import { seedProjects } from './seedProjects';

async function main() {
  // Seed users and profiles first
  await seedUsers(prisma);

  // Seed projects, repositories, and technologies
  await seedProjects(prisma);
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