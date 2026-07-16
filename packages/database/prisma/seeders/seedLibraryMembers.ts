import { PrismaClient } from '../../src/generated/prisma/client';

interface LibraryMemberSeed {
  organizationSlug: string;
  libraryCardNumber: string;
  membershipType: 'STUDENT' | 'REGULAR' | 'PREMIUM';
  membershipStatus:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'SUSPENDED'
    | 'PENDING'
    | 'CANCELLED';
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
    membershipType: 'REGULAR',
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
    membershipType: 'REGULAR',
    membershipStatus: 'ACTIVE',
    membershipStartDate: new Date('2026-01-15'),
  },
  {
    organizationSlug: 'datasync-analytics',
    libraryCardNumber: 'DA-0001',
    membershipType: 'REGULAR',
    membershipStatus: 'SUSPENDED',
    membershipStartDate: new Date('2025-10-01'),
    membershipEndDate: new Date('2026-01-01'),
  },
];

// Extra walk-in members for TechCorp so the staff /members list has enough
// rows to page past 20/page. Deterministic (no faker) to keep seeds
// reproducible; statuses/types cycle so the list filters have data to match.
const BULK_TECHCORP_MEMBER_COUNT = 30;
const MEMBERSHIP_TYPE_CYCLE: LibraryMemberSeed['membershipType'][] = [
  'STUDENT',
  'REGULAR',
  'PREMIUM',
];
const MEMBERSHIP_STATUS_CYCLE: LibraryMemberSeed['membershipStatus'][] = [
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'PENDING',
  'CANCELLED',
];

for (let i = 1; i <= BULK_TECHCORP_MEMBER_COUNT; i++) {
  const membershipStatus =
    MEMBERSHIP_STATUS_CYCLE[i % MEMBERSHIP_STATUS_CYCLE.length];
  LIBRARY_MEMBERS.push({
    organizationSlug: 'techcorp-solutions',
    libraryCardNumber: `TC-1${String(i).padStart(3, '0')}`, // TC-1001..TC-1030
    membershipType: MEMBERSHIP_TYPE_CYCLE[i % MEMBERSHIP_TYPE_CYCLE.length],
    membershipStatus,
    membershipStartDate: new Date(2026, 0, 1 + i),
    // Give the terminal statuses an end date for realism.
    membershipEndDate:
      membershipStatus === 'EXPIRED' || membershipStatus === 'CANCELLED'
        ? new Date(2026, 5, 1 + i)
        : undefined,
    // Walk-in patrons: no linked login user.
  });
}

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

    // Create the login user (if any) and the library member together so a
    // failed member insert also rolls back the MEMBER user it belongs to.
    await prisma.$transaction(async (tx) => {
      const user = member.user
        ? await tx.user.create({
            data: {
              email: member.user.email,
              name: member.user.name,
              isConfirmed: true,
              role: 'MEMBER',
              // MEMBER users are not tied to an org via User.organizationId;
              // their library membership lives in the LibraryMember row below.
            },
          })
        : null;

      await tx.libraryMember.create({
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
    });

    console.log(
      `  Created library member: ${member.libraryCardNumber} (${member.membershipStatus}) - Organization: ${organization.name}`,
    );
  }

  console.log(`Library members seeded: ${LIBRARY_MEMBERS.length} total`);
}
