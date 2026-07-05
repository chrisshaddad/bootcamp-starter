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

  console.log(
    `Circulation seeded: ${seededRentals} rentals, ${seededReservations} reservations`,
  );
}
