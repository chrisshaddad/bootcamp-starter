import { PrismaClient, Prisma } from '../../src/generated/prisma/client';

const SUPER_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'admin@bootcamp-starter.local',
    name: 'Super Admin',
  },
  // Add more super admins as needed
];

// Gym admins - these will be linked to gyms in seedGyms.ts
// The order here matches the order in seedGyms.ts
const ORG_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'admin@ironpeak.example.com',
    name: 'Sarah Chen',
  },
  {
    email: 'admin@flexzone.example.com',
    name: 'Michael Torres',
  },
  {
    email: 'admin@mountainwellness.example.com',
    name: 'Dr. Emily Watson',
  },
  {
    email: 'admin@cityboxing.example.com',
    name: 'Roberto Martinez',
  },
  {
    email: 'admin@velocitysports.example.com',
    name: 'Jake Williams',
  },
  {
    email: 'admin@profitraining.example.com',
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
