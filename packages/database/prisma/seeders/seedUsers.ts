import { PrismaClient, Prisma } from '../../src/generated/prisma/client';

const SUPER_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'admin@gymflow.io',
    name: 'Super Admin',
  },
  // Add more super admins as needed
];

// Gym admins - these will be linked to gyms in seedGyms.ts
// The order here matches the order in seedGyms.ts
const ORG_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'sarah.chen@ironpeakfitness.com',
    name: 'Sarah Chen',
  },
  {
    email: 'michael@flexzonegym.com',
    name: 'Michael Torres',
  },
  {
    email: 'emily.watson@mountainwellness.co',
    name: 'Dr. Emily Watson',
  },
  {
    email: 'roberto@cityboxingclub.com',
    name: 'Roberto Martinez',
  },
  {
    email: 'jake@velocitysports.fit',
    name: 'Jake Williams',
  },
  {
    email: 'anna.davis@profittraining.com',
    name: 'Anna Davis',
  },
];

export async function seedSuperAdmins(prisma: PrismaClient) {
  console.log('Seeding super admins...');

  await prisma.user.createMany({
    data: SUPER_ADMINS.map((admin) => ({
      ...admin,
      isConfirmed: true,
      role: 'SUPER_ADMIN',
    })),
  });

  console.log(
    `Super admins: ${SUPER_ADMINS.map((u) => u.email).join(', ')} seeded.`,
  );
}

export async function seedOrgAdmins(prisma: PrismaClient) {
  console.log('Seeding org admins...');

  await prisma.user.createMany({
    data: ORG_ADMINS.map((admin) => ({
      ...admin,
      isConfirmed: true,
      role: 'ORG_ADMIN',
    })),
  });

  console.log(
    `Org admins: ${ORG_ADMINS.map((u) => u.email).join(', ')} seeded.`,
  );
}
