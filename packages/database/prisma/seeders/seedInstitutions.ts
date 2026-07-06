import { PrismaClient } from '../../src/generated/prisma/client';

interface InstitutionAdminSeed {
  username: string;
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

// Sample institutions with varied statuses
const INSTITUTIONS: InstitutionSeed[] = [
  {
    name: 'TechCorp Medical Center',
    type: 'CLINIC',
    status: 'ACTIVE',
    address: '100 Innovation Drive, San Francisco, CA',
    admin: {
      username: 'sarah.chen',
      email: 'admin@techcorp.example.com',
      fullName: 'Sarah Chen',
      phone: '+14155550101',
    },
  },
  {
    name: 'Green Valley Hospital',
    type: 'HOSPITAL',
    status: 'ACTIVE',
    address: '200 Renewable Way, Austin, TX',
    admin: {
      username: 'michael.green',
      email: 'admin@greenvalley.example.com',
      fullName: 'Michael Green',
      phone: '+15125550102',
    },
  },
  {
    name: 'HealthFirst Diagnostics Lab',
    type: 'LAB',
    status: 'PENDING',
    address: '300 Wellness Blvd, Boston, MA',
    admin: {
      username: 'emily.watson',
      email: 'admin@healthfirst.example.com',
      fullName: 'Dr. Emily Watson',
      phone: '+16175550103',
    },
  },
  {
    name: 'Urban Care Clinic',
    type: 'CLINIC',
    status: 'PENDING',
    address: '400 Main St, Denver, CO',
    admin: {
      username: 'robert.martinez',
      email: 'admin@urbancare.example.com',
      fullName: 'Robert Martinez',
      phone: '+13035550104',
    },
  },
  {
    name: 'Fraudulent Health Services',
    type: 'CLINIC',
    status: 'REJECTED',
    address: null,
    admin: {
      username: 'john.suspicious',
      email: 'admin@fraudulent.example.com',
      fullName: 'John Suspicious',
      phone: '+19995550105',
    },
  },
  {
    name: 'DataSync Radiology',
    type: 'LAB',
    status: 'SUSPENDED',
    address: '500 Analytics Ave, Seattle, WA',
    admin: {
      username: 'anna.data',
      email: 'admin@datasync.example.com',
      fullName: 'Anna Data',
      phone: '+12065550106',
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
      `  Created institution: ${institution.name} (${institution.status}) - Admin: ${institution.admin.username}`,
    );
  }

  console.log(`Institutions seeded: ${INSTITUTIONS.length} total`);
}
