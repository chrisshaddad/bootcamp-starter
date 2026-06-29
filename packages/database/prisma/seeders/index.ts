import { prisma } from '../../src/client';

// No seeders yet for Forward-Mena. Add seed functions here and call them below.
// Example:
//   await seedOrganizations(prisma);
async function main() {
  console.log('[@repo/db] No seeders defined yet — nothing to seed.');
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
