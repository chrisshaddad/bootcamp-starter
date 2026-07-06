import { PrismaClient } from '../../src/generated/prisma/client';

// Reserved id for the platform institution — see the comment on the
// Institution model in schema.prisma. SUPER_ADMIN users attach to this row
// instead of a real institution, since institutionId is required on User.
export const PLATFORM_INSTITUTION_ID = '00000000-0000-0000-0000-000000000000';

interface SuperAdminSeed {
  username: string;
  email: string;
  fullName: string;
  phone: string;
}

const SUPER_ADMINS: SuperAdminSeed[] = [
  {
    username: 'superadmin',
    email: 'admin@medilink.local',
    fullName: 'Super Admin',
    phone: '+10000000000',
  },
  // Add more super admins as needed
];

export async function seedPlatformInstitution(prisma: PrismaClient) {
  console.log('Seeding platform institution...');

  await prisma.institution.upsert({
    where: { id: PLATFORM_INSTITUTION_ID },
    update: {},
    create: {
      id: PLATFORM_INSTITUTION_ID,
      name: 'MediLink Platform',
      // InstitutionType has no platform-level option — CLINIC is a placeholder.
      type: 'CLINIC',
      status: 'ACTIVE',
    },
  });

  console.log('Platform institution seeded.');
}

export async function seedSuperAdmins(prisma: PrismaClient) {
  console.log('Seeding super admins...');

  await prisma.user.createMany({
    data: SUPER_ADMINS.map((admin) => ({
      ...admin,
      isConfirmed: true,
      role: 'SUPER_ADMIN',
      institutionId: PLATFORM_INSTITUTION_ID,
    })),
  });

  console.log(
    `Super admins: ${SUPER_ADMINS.map((u) => u.username).join(', ')} seeded.`,
  );
}
