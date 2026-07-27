import { PrismaClient } from '../../src/generated/prisma/client';

interface RentalSeed {
  organizationSlug: string;
  bookCopyBarcode: string;
  memberCardNumber: string;
  staffEmail: string;
  rentedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';
  fineAmount?: string;
  finePaid?: boolean;
  notes?: string;
}

interface ReservationSeed {
  organizationSlug: string;
  bookTitle: string;
  memberCardNumber: string;
  reservedAt: Date;
  expiresAt?: Date;
  status: 'ACTIVE' | 'READY_FOR_PICKUP' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
  notifiedAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
}

// Seed dates are computed relative to "now" so the seeded statuses stay
// internally consistent (e.g. an ACTIVE rental is not yet due, an OVERDUE
// rental is past due, a READY_FOR_PICKUP reservation has not expired) no
// matter when the seed runs.
const now = new Date();
const daysFromNow = (days: number): Date => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date;
};

const RENTALS: RentalSeed[] = [
  // ACTIVE: checked out recently, not yet due. Copy TC-KIN-002 is ON_LOAN.
  {
    organizationSlug: 'techcorp-solutions',
    bookCopyBarcode: 'TC-KIN-002',
    memberCardNumber: 'TC-0001',
    staffEmail: 'librarian@techcorp.example.com',
    rentedAt: daysFromNow(-4),
    dueDate: daysFromNow(10),
    status: 'ACTIVE',
  },
  // RETURNED: returned before the due date. Copy TC-MAR-001 is AVAILABLE.
  {
    organizationSlug: 'techcorp-solutions',
    bookCopyBarcode: 'TC-MAR-001',
    memberCardNumber: 'TC-0002',
    staffEmail: 'librarian@techcorp.example.com',
    rentedAt: daysFromNow(-40),
    dueDate: daysFromNow(-26),
    returnedAt: daysFromNow(-30),
    status: 'RETURNED',
    fineAmount: '0.00',
    finePaid: true,
  },
  // LOST: never returned, marked lost with an outstanding fine. Copy GE-PP-002 is LOST.
  {
    organizationSlug: 'green-energy-partners',
    bookCopyBarcode: 'GE-PP-002',
    memberCardNumber: 'GE-0001',
    staffEmail: 'librarian@greenenergy.example.com',
    rentedAt: daysFromNow(-90),
    dueDate: daysFromNow(-76),
    status: 'LOST',
    fineAmount: '35.00',
    finePaid: false,
    notes: 'Member reported the copy missing after travel.',
  },
  // OVERDUE: past due and still out. Copy HF-EOM-001 is ON_LOAN.
  {
    organizationSlug: 'healthfirst-medical-group',
    bookCopyBarcode: 'HF-EOM-001',
    memberCardNumber: 'HF-0001',
    staffEmail: 'librarian@healthfirst.example.com',
    rentedAt: daysFromNow(-24),
    dueDate: daysFromNow(-10),
    status: 'OVERDUE',
    fineAmount: '4.50',
    finePaid: false,
  },
];

const RESERVATIONS: ReservationSeed[] = [
  // READY_FOR_PICKUP: notified, not yet expired. Copy TC-MAR-002 is RESERVED.
  {
    organizationSlug: 'techcorp-solutions',
    bookTitle: 'The Martian',
    memberCardNumber: 'TC-0001',
    reservedAt: daysFromNow(-3),
    expiresAt: daysFromNow(4),
    status: 'READY_FOR_PICKUP',
    notifiedAt: daysFromNow(-2),
  },
  // CANCELLED: cancelled before expiry.
  {
    organizationSlug: 'techcorp-solutions',
    bookTitle: 'The Left Hand of Darkness',
    memberCardNumber: 'TC-0002',
    reservedAt: daysFromNow(-20),
    expiresAt: daysFromNow(-13),
    status: 'CANCELLED',
    cancelledAt: daysFromNow(-17),
  },
  // FULFILLED: picked up shortly after being notified.
  {
    organizationSlug: 'green-energy-partners',
    bookTitle: 'Between the World and Me',
    memberCardNumber: 'GE-0001',
    reservedAt: daysFromNow(-30),
    expiresAt: daysFromNow(-23),
    status: 'FULFILLED',
    notifiedAt: daysFromNow(-29),
    fulfilledAt: daysFromNow(-28),
  },
  // ACTIVE: open hold, not yet expired. Copy HF-EOM-002 is RESERVED.
  {
    organizationSlug: 'healthfirst-medical-group',
    bookTitle: 'The Emperor of All Maladies',
    memberCardNumber: 'HF-0001',
    reservedAt: daysFromNow(-2),
    expiresAt: daysFromNow(5),
    status: 'ACTIVE',
  },
];

// Volume of extra history to give TechCorp member TC-0001 so its member-detail
// rental/reservation tables page past 10/row in the staff UI.
const BULK_RENTAL_COUNT = 18;
const BULK_RESERVATION_COUNT = 18;
const BULK_RESERVATION_STATUS_CYCLE: ReservationSeed['status'][] = [
  'FULFILLED',
  'EXPIRED',
  'CANCELLED',
  'ACTIVE',
  'READY_FOR_PICKUP',
];

// Fatten TC-0001's history. Rentals are all RETURNED (historical), so reusing
// the org's copies never trips the "one open rental per copy" rule; a few
// carry an unpaid fine so the member's "Outstanding fines" tile is non-zero.
async function seedTechCorpMemberHistory(
  prisma: PrismaClient,
): Promise<{ rentals: number; reservations: number }> {
  const organization = await prisma.organization.findUnique({
    where: { slug: 'techcorp-solutions' },
  });
  if (!organization) return { rentals: 0, reservations: 0 };

  const [member, staff, copies, books] = await Promise.all([
    prisma.libraryMember.findFirst({
      where: { organizationId: organization.id, libraryCardNumber: 'TC-0001' },
    }),
    prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        role: { in: ['ORG_ADMIN', 'LIBRARIAN'] },
      },
    }),
    prisma.bookCopy.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
    }),
    prisma.book.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
    }),
  ]);

  let rentals = 0;
  let reservations = 0;

  if (member && staff && copies.length > 0) {
    for (let i = 0; i < BULK_RENTAL_COUNT; i++) {
      const offset = 20 + i * 7;
      const hasFine = i % 5 === 0;
      await prisma.rental.create({
        data: {
          organizationId: organization.id,
          bookCopyId: copies[i % copies.length].id,
          memberId: member.id,
          staffId: staff.id,
          rentedAt: daysFromNow(-offset),
          dueDate: daysFromNow(-offset + 14),
          returnedAt: daysFromNow(-offset + 12),
          status: 'RETURNED',
          fineAmount: hasFine ? '3.50' : '0.00',
          finePaid: !hasFine,
        },
      });
      rentals += 1;
    }
  }

  if (member && books.length > 0) {
    for (let i = 0; i < BULK_RESERVATION_COUNT; i++) {
      const status =
        BULK_RESERVATION_STATUS_CYCLE[i % BULK_RESERVATION_STATUS_CYCLE.length];
      const reservedAt = daysFromNow(-(5 + i * 6));
      await prisma.reservation.create({
        data: {
          organizationId: organization.id,
          bookId: books[i % books.length].id,
          memberId: member.id,
          reservedAt,
          expiresAt: daysFromNow(-(5 + i * 6) + 7),
          status,
          notifiedAt:
            status === 'READY_FOR_PICKUP' || status === 'FULFILLED'
              ? reservedAt
              : undefined,
          fulfilledAt: status === 'FULFILLED' ? reservedAt : undefined,
          cancelledAt: status === 'CANCELLED' ? reservedAt : undefined,
        },
      });
      reservations += 1;
    }
  }

  return { rentals, reservations };
}

// TechCorp's org-wide staff views (Overdue, Reservations) and the dashboard's
// 14-day trend both need more than one member's activity to look real. This
// backs the "TC-EXT-*" bulk catalog's on-loan copies with real rentals spread
// across the org's other members (not just TC-0001), plus a batch of
// reservations against the same bulk books.
const BULK_ACTIVE_COUNT = 16; // remaining "TC-EXT-*" on-loan copies go OVERDUE
const BULK_ORG_RESERVATION_COUNT = 10;

async function seedTechCorpOrgWideActivity(
  prisma: PrismaClient,
): Promise<{ rentals: number; reservations: number }> {
  const organization = await prisma.organization.findUnique({
    where: { slug: 'techcorp-solutions' },
  });
  if (!organization) return { rentals: 0, reservations: 0 };

  const [onLoanCopies, members, staff, bulkBooks] = await Promise.all([
    prisma.bookCopy.findMany({
      where: {
        organizationId: organization.id,
        barcode: { startsWith: 'TC-EXT-' },
        status: 'ON_LOAN',
      },
      orderBy: { barcode: 'asc' },
    }),
    prisma.libraryMember.findMany({
      where: { organizationId: organization.id },
      orderBy: { libraryCardNumber: 'asc' },
    }),
    prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        email: 'librarian@techcorp.example.com',
      },
    }),
    // The bulk catalog's books, identified by their "TC-EXT-*" copies
    // (publisherId is no longer a reliable signal now that bulk books have
    // real publishers too).
    prisma.book.findMany({
      where: {
        organizationId: organization.id,
        copies: { some: { barcode: { startsWith: 'TC-EXT-' } } },
      },
      orderBy: { title: 'asc' },
    }),
  ]);

  let rentals = 0;
  let reservations = 0;

  if (onLoanCopies.length > 0 && members.length > 0 && staff) {
    for (let i = 0; i < onLoanCopies.length; i++) {
      const member = members[i % members.length];
      const active = i < BULK_ACTIVE_COUNT;
      const rentedAt = active
        ? daysFromNow(-(1 + (i % 10)))
        : daysFromNow(-(20 + (i % 15)));
      const dueDate = active
        ? daysFromNow(14 - (i % 10))
        : daysFromNow(-(6 + (i % 10)));

      await prisma.rental.create({
        data: {
          organizationId: organization.id,
          bookCopyId: onLoanCopies[i].id,
          memberId: member.id,
          staffId: staff.id,
          rentedAt,
          dueDate,
          status: active ? 'ACTIVE' : 'OVERDUE',
          fineAmount: active ? '0.00' : '2.50',
          finePaid: false,
        },
      });
      rentals += 1;
    }
  }

  if (bulkBooks.length > 0 && members.length > 0) {
    for (let i = 0; i < BULK_ORG_RESERVATION_COUNT; i++) {
      const book = bulkBooks[i % bulkBooks.length];
      // Offset from the members used for rentals above so the same person
      // isn't always both renting and reserving in this seed.
      const member = members[(i + BULK_ACTIVE_COUNT) % members.length];
      const status =
        BULK_RESERVATION_STATUS_CYCLE[i % BULK_RESERVATION_STATUS_CYCLE.length];
      const reservedAt = daysFromNow(-(1 + i * 2));

      await prisma.reservation.create({
        data: {
          organizationId: organization.id,
          bookId: book.id,
          memberId: member.id,
          reservedAt,
          expiresAt: daysFromNow(-(1 + i * 2) + 7),
          status,
          notifiedAt:
            status === 'READY_FOR_PICKUP' || status === 'FULFILLED'
              ? reservedAt
              : undefined,
          fulfilledAt: status === 'FULFILLED' ? reservedAt : undefined,
          cancelledAt: status === 'CANCELLED' ? reservedAt : undefined,
        },
      });
      reservations += 1;
    }
  }

  return { rentals, reservations };
}

export async function seedCirculation(prisma: PrismaClient) {
  console.log('Seeding circulation...');

  let seededRentals = 0;
  let seededReservations = 0;

  for (const rental of RENTALS) {
    const organization = await prisma.organization.findUnique({
      where: { slug: rental.organizationSlug },
    });

    if (!organization) {
      console.warn(
        `  Warning: Organization ${rental.organizationSlug} not found. Skipping rental ${rental.bookCopyBarcode}.`,
      );
      continue;
    }

    const [bookCopy, member, staff] = await Promise.all([
      prisma.bookCopy.findFirst({
        where: {
          organizationId: organization.id,
          barcode: rental.bookCopyBarcode,
        },
      }),
      prisma.libraryMember.findFirst({
        where: {
          organizationId: organization.id,
          libraryCardNumber: rental.memberCardNumber,
        },
      }),
      prisma.user.findFirst({
        where: {
          organizationId: organization.id,
          email: rental.staffEmail,
          role: { in: ['ORG_ADMIN', 'LIBRARIAN'] },
        },
      }),
    ]);

    if (!bookCopy || !member || !staff) {
      console.warn(
        `  Warning: Missing rental dependency for ${rental.bookCopyBarcode}. Skipping.`,
      );
      continue;
    }

    await prisma.rental.create({
      data: {
        organizationId: organization.id,
        bookCopyId: bookCopy.id,
        memberId: member.id,
        staffId: staff.id,
        rentedAt: rental.rentedAt,
        dueDate: rental.dueDate,
        returnedAt: rental.returnedAt,
        status: rental.status,
        fineAmount: rental.fineAmount ?? '0.00',
        finePaid: rental.finePaid ?? false,
        notes: rental.notes,
      },
    });

    seededRentals += 1;
    console.log(
      `  Created rental: ${rental.bookCopyBarcode} (${rental.status}) - Member: ${rental.memberCardNumber}`,
    );
  }

  for (const reservation of RESERVATIONS) {
    const organization = await prisma.organization.findUnique({
      where: { slug: reservation.organizationSlug },
    });

    if (!organization) {
      console.warn(
        `  Warning: Organization ${reservation.organizationSlug} not found. Skipping reservation ${reservation.bookTitle}.`,
      );
      continue;
    }

    const [book, member] = await Promise.all([
      prisma.book.findFirst({
        where: {
          organizationId: organization.id,
          title: reservation.bookTitle,
        },
      }),
      prisma.libraryMember.findFirst({
        where: {
          organizationId: organization.id,
          libraryCardNumber: reservation.memberCardNumber,
        },
      }),
    ]);

    if (!book || !member) {
      console.warn(
        `  Warning: Missing reservation dependency for ${reservation.bookTitle}. Skipping.`,
      );
      continue;
    }

    await prisma.reservation.create({
      data: {
        organizationId: organization.id,
        bookId: book.id,
        memberId: member.id,
        reservedAt: reservation.reservedAt,
        expiresAt: reservation.expiresAt,
        status: reservation.status,
        notifiedAt: reservation.notifiedAt,
        fulfilledAt: reservation.fulfilledAt,
        cancelledAt: reservation.cancelledAt,
      },
    });

    seededReservations += 1;
    console.log(
      `  Created reservation: ${reservation.bookTitle} (${reservation.status}) - Member: ${reservation.memberCardNumber}`,
    );
  }

  const bulk = await seedTechCorpMemberHistory(prisma);
  seededRentals += bulk.rentals;
  seededReservations += bulk.reservations;
  if (bulk.rentals || bulk.reservations) {
    console.log(
      `  Added TC-0001 history volume: ${bulk.rentals} rentals, ${bulk.reservations} reservations`,
    );
  }

  const orgWide = await seedTechCorpOrgWideActivity(prisma);
  seededRentals += orgWide.rentals;
  seededReservations += orgWide.reservations;
  if (orgWide.rentals || orgWide.reservations) {
    console.log(
      `  Added TechCorp org-wide activity: ${orgWide.rentals} rentals, ${orgWide.reservations} reservations`,
    );
  }

  console.log(
    `Circulation seeded: ${seededRentals} rentals, ${seededReservations} reservations`,
  );
}
