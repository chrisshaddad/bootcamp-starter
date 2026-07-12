import { PrismaClient } from '../../src/generated/prisma/client';

interface OrganizationSeed {
  name: string;
  description: string;
  website: string | null;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'INACTIVE';
  createdAt: Date;
  approvedAt?: Date;
  adminEmail: string;
}

const ORGANIZATIONS: OrganizationSeed[] = [
  {
    name: 'TechCorp Solutions',
    description:
      'A leading technology company specializing in enterprise software solutions and cloud infrastructure.',
    website: 'https://techcorp.example.com',
    status: 'ACTIVE',
    createdAt: new Date('2025-10-15'),
    approvedAt: new Date('2025-10-18'),
    adminEmail: 'admin@techcorp.example.com',
  },
  {
    name: 'Green Energy Partners',
    description:
      'Sustainable energy consulting firm focused on renewable energy solutions for businesses.',
    website: 'https://greenenergy.example.com',
    status: 'ACTIVE',
    createdAt: new Date('2025-11-01'),
    approvedAt: new Date('2025-11-03'),
    adminEmail: 'admin@greenenergy.example.com',
  },
  {
    name: 'HealthFirst Medical Group',
    description:
      'Healthcare management organization operating multiple clinics and medical facilities.',
    website: 'https://healthfirst.example.com',
    status: 'PENDING',
    createdAt: new Date('2026-01-20'),
    adminEmail: 'admin@healthfirst.example.com',
  },
  {
    name: 'Urban Construction Ltd',
    description:
      'Commercial and residential construction company with projects across the region.',
    website: 'https://urbanconstruction.example.com',
    status: 'PENDING',
    createdAt: new Date('2026-01-28'),
    adminEmail: 'admin@urbanconstruction.example.com',
  },
  {
    name: 'Fraudulent Enterprises Inc',
    description:
      'Application rejected due to suspicious business practices and unverifiable information.',
    website: null,
    status: 'REJECTED',
    createdAt: new Date('2025-12-10'),
    adminEmail: 'admin@fraudulent.example.com',
  },
  {
    name: 'DataSync Analytics',
    description:
      'Business intelligence and data analytics firm helping companies make data-driven decisions.',
    website: 'https://datasync.example.com',
    status: 'SUSPENDED',
    createdAt: new Date('2025-09-05'),
    approvedAt: new Date('2025-09-08'),
    adminEmail: 'admin@datasync.example.com',
  },
];

export async function seedOrganizations(prisma: PrismaClient) {
  console.log('Seeding organizations...');

  const superAdmin = await prisma.user.findFirst({
    where: {
      role: 'SUPER_ADMIN',
    },
  });

  if (!superAdmin) {
    throw new Error('No super admin found. Seed super admins first.');
  }

  for (const org of ORGANIZATIONS) {
    const orgAdmin = await prisma.user.findUnique({
      where: {
        email: org.adminEmail,
      },
    });

    if (!orgAdmin) {
      console.warn(
        `Warning: Org admin ${org.adminEmail} not found. Skipping ${org.name}.`,
      );
      continue;
    }

    const approvalData = org.approvedAt
      ? {
          approvedAt: org.approvedAt,
          approvedById: superAdmin.id,
        }
      : {
          approvedAt: null,
          approvedById: null,
        };

    const existingOrganization = await prisma.organization.findFirst({
      where: {
        createdById: orgAdmin.id,
      },
    });

    if (existingOrganization) {
      const updatedOrg = await prisma.organization.update({
        where: {
          id: existingOrganization.id,
        },
        data: {
          name: org.name,
          description: org.description,
          website: org.website,
          status: org.status,
          createdAt: org.createdAt,
          ...approvalData,
        },
      });

      await prisma.user.update({
        where: {
          id: orgAdmin.id,
        },
        data: {
          organizationId: updatedOrg.id,
        },
      });

      console.log(
        `Updated organization: ${updatedOrg.name} (${updatedOrg.status}) - Admin: ${orgAdmin.email}`,
      );

      continue;
    }

    const createdOrg = await prisma.organization.create({
      data: {
        name: org.name,
        description: org.description,
        website: org.website,
        status: org.status,
        createdAt: org.createdAt,
        createdById: orgAdmin.id,
        ...approvalData,
      },
    });

    await prisma.user.update({
      where: {
        id: orgAdmin.id,
      },
      data: {
        organizationId: createdOrg.id,
      },
    });

    console.log(
      `Created organization: ${createdOrg.name} (${createdOrg.status}) - Admin: ${orgAdmin.email}`,
    );
  }

  console.log(`Organizations seeded: ${ORGANIZATIONS.length} total`);
}
