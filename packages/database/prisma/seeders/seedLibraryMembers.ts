import { PrismaClient } from '../../src/generated/prisma/client';

interface LibraryMemberSeed {
  organizationSlug: string;
  libraryCardNumber: string;
  membershipType: 'STUDENT' | 'ADULT' | 'PREMIUM';
  membershipStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'PENDING' | 'CANCELLED';
  membershipStartDate: Date;
  membershipEndDate?: Date;
  user?: {
    email: string;
    name: string;
  };
}

const LIBRARY_MEMBERS: LibraryMemberSeed[] = [
  {
    organizationSlug: 'techcorp-solutions',
    libraryCardNumber: 'TC-0001',
    membershipType: 'ADULT',
    membershipStatus: 'ACTIVE',
    membershipStartDate: new Date('2026-01-05'),
    user: {
      email: 'member.alex@techcorp.example.com',
      name: 'Alex Morgan',
    },
  },
  {
    organizationSlug: 'techcorp-solutions',
    libraryCardNumber: 'TC-0002',
    membershipType: 'STUDENT',
    membershipStatus: 'PENDING',
    membershipStartDate: new Date('2026-02-10'),
    user: {
      email: 'member.jordan@techcorp.example.com',
      name: 'Jordan Lee',
    },
  },
  {
    organizationSlug: 'green-energy-partners',
    libraryCardNumber: 'GE-0001',
    membershipType: 'PREMIUM',
    membershipStatus: 'ACTIVE',
    membershipStartDate: new Date('2025-12-01'),
    user: {
      email: 'member.casey@greenenergy.example.com',
      name: 'Casey Rivera',
    },
  },
  {
    organizationSlug: 'healthfirst-medical-group',
    libraryCardNumber: 'HF-0001',
    membershipType: 'ADULT',
    membershipStatus: 'ACTIVE',
    membershipStartDate: new Date('2026-01-15'),
  },
  {
    organizationSlug: 'datasync-analytics',
    libraryCardNumber: 'DA-0001',
    membershipType: 'ADULT',
    membershipStatus: 'SUSPENDED',
    membershipStartDate: new Date('2025-10-01'),
    membershipEndDate: new Date('2026-01-01'),
  },
];

export async function seedLibraryMembers(prisma: PrismaClient) {
  console.log('Seeding library members...');

  for (const member of LIBRARY_MEMBERS) {
    const organization = await prisma.organization.findUnique({
      where: { slug: member.organizationSlug },
    });

    if (!organization) {
      console.warn(
        `  Warning: Organization ${member.organizationSlug} not found. Skipping member ${member.libraryCardNumber}.`,
      );
      continue;
    }

    const user = member.user
      ? await prisma.user.create({
          data: {
            email: member.user.email,
            name: member.user.name,
            isConfirmed: true,
            role: 'MEMBER',
            organizationId: organization.id,
          },
        })
      : null;

    await prisma.libraryMember.create({
      data: {
        organizationId: organization.id,
        userId: user?.id,
        libraryCardNumber: member.libraryCardNumber,
        membershipType: member.membershipType,
        membershipStatus: member.membershipStatus,
        membershipStartDate: member.membershipStartDate,
        membershipEndDate: member.membershipEndDate,
      },
    });

    console.log(
      `  Created library member: ${member.libraryCardNumber} (${member.membershipStatus}) - Organization: ${organization.name}`,
    );
  }

  console.log(`Library members seeded: ${LIBRARY_MEMBERS.length} total`);
}
