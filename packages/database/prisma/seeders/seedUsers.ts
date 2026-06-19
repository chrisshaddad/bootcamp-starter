import {
  PrismaClient,
  Prisma,
  UserRole,
} from '../../src/generated/prisma/client';

const SUPER_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'admin@bootcamp-starter.local',
    name: 'Super Admin',
  },
  // Add more super admins as needed
];

// Org admins - these will be linked to organizations in seedOrganizations.ts
// The order here matches the order in seedOrganizations.ts
const ORG_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'admin@techcorp.example.com',
    name: 'Sarah Chen',
  },
  {
    email: 'admin@greenenergy.example.com',
    name: 'Michael Green',
  },
  {
    email: 'admin@healthfirst.example.com',
    name: 'Dr. Emily Watson',
  },
  {
    email: 'admin@urbanconstruction.example.com',
    name: 'Robert Martinez',
  },
  {
    email: 'admin@fraudulent.example.com',
    name: 'John Suspicious',
  },
  {
    email: 'admin@datasync.example.com',
    name: 'Anna Data',
  },
];

// Auth members — linked to organizations in seedOrganizations.ts
const ORG_MEMBERS: Prisma.UserCreateManyInput[] = [
  {
    email: 'member@techcorp.example.com',
    name: 'Alex Rivera',
  },
  {
    email: 'member@greenenergy.example.com',
    name: 'Jordan Lee',
  },
];

async function upsertUsers(
  prisma: PrismaClient,
  users: Prisma.UserCreateManyInput[],
  role: UserRole,
  label: string,
) {
  console.log(`Seeding ${label}...`);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        isConfirmed: true,
        role,
      },
      update: {
        name: user.name,
        isConfirmed: true,
        role,
      },
    });
  }

  console.log(`${label}: ${users.map((u) => u.email).join(', ')} ready.`);
}

export async function seedSuperAdmins(prisma: PrismaClient) {
  await upsertUsers(prisma, SUPER_ADMINS, 'SUPER_ADMIN', 'super admins');
}

export async function seedOrgAdmins(prisma: PrismaClient) {
  await upsertUsers(prisma, ORG_ADMINS, 'ORG_ADMIN', 'org admins');
}

export async function seedOrgMembers(prisma: PrismaClient) {
  await upsertUsers(prisma, ORG_MEMBERS, 'MEMBER', 'org members');
}
