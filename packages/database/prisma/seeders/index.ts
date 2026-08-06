import { prisma } from '../../src/client';
import { seedUsers } from './seedUsers';
import { seedProjects } from './seedProjects';
import { SeedObjectStorage } from './seedObjectStorage';

async function main() {
  const objectStorage = new SeedObjectStorage();
  await objectStorage.assertAvailable();

  // Seed users and profiles first
  await seedUsers(prisma, objectStorage);

  // Seed projects, repositories, and technologies
  await seedProjects(prisma, objectStorage);
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
