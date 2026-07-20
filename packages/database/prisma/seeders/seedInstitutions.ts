import { PrismaClient } from '../../src/generated/prisma/client';

interface InstitutionAdminSeed {
  email: string;
  fullName: string;
  phone: string;
}

interface InstitutionSeed {
  name: string;
  type: 'CLINIC' | 'HOSPITAL' | 'LAB';
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'INACTIVE';
  address: string | null;
  admin: InstitutionAdminSeed;
}

// Colleague-admin institutions — kept to exactly these two, alongside the
// reserved platform institution (seedUsers.ts) and Central Perk Medical
// Center (seedFriendsInstitution.ts), for a total of 4 institutions.
const INSTITUTIONS: InstitutionSeed[] = [
  {
    name: 'Cedar Heights Medical Group',
    type: 'HOSPITAL',
    status: 'ACTIVE',
    address: '600 Cedar Heights Blvd, Chicago, IL',
    admin: {
      email: 'jad.hneiny@cedarheightsmedical.example.com',
      fullName: 'Jad Hneiny',
      phone: '+13125550107',
    },
  },
  {
    name: 'Bellerive Health Clinic',
    type: 'CLINIC',
    status: 'ACTIVE',
    address: '700 Bellerive Lane, Miami, FL',
    admin: {
      email: 'jean-luc.kiami@bellerivehealth.example.com',
      fullName: 'Jean-Luc Kiami',
      phone: '+13055550108',
    },
  },
];

export async function seedInstitutions(prisma: PrismaClient) {
  console.log('Seeding institutions...');

  // The institution admin's createdById is set to the super admin who onboarded them
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!superAdmin) {
    throw new Error('No super admin found. Seed super admins first.');
  }

  for (const institution of INSTITUTIONS) {
    const createdInstitution = await prisma.institution.create({
      data: {
        name: institution.name,
        type: institution.type,
        status: institution.status,
        address: institution.address,
      },
    });

    await prisma.user.create({
      data: {
        ...institution.admin,
        role: 'INSTITUTION_ADMIN',
        isConfirmed: true,
        institutionId: createdInstitution.id,
        createdById: superAdmin.id,
      },
    });

    console.log(
      `  Created institution: ${institution.name} (${institution.status}) - Admin: ${institution.admin.email}`,
    );
  }

  console.log(`Institutions seeded: ${INSTITUTIONS.length} total`);
}
