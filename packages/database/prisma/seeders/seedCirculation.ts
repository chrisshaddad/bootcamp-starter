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

const RENTALS: RentalSeed[] = [
  {
    organizationSlug: 'techcorp-solutions',
    bookCopyBarcode: 'TC-KIN-002',
    memberCardNumber: 'TC-0001',
    staffEmail: 'librarian@techcorp.example.com',
    rentedAt: new Date('2026-02-01'),
    dueDate: new Date('2026-02-15'),
    status: 'ACTIVE',
  },
  {
    organizationSlug: 'techcorp-solutions',
    bookCopyBarcode: 'TC-MAR-001',
    memberCardNumber: 'TC-0002',
    staffEmail: 'librarian@techcorp.example.com',
    rentedAt: new Date('2026-01-10'),
    dueDate: new Date('2026-01-24'),
    returnedAt: new Date('2026-01-20'),
    status: 'RETURNED',
    fineAmount: '0.00',
    finePaid: true,
  },
  {
    organizationSlug: 'green-energy-partners',
    bookCopyBarcode: 'GE-PP-002',
    memberCardNumber: 'GE-0001',
    staffEmail: 'librarian@greenenergy.example.com',
    rentedAt: new Date('2025-12-15'),
    dueDate: new Date('2025-12-29'),
    status: 'LOST',
    fineAmount: '35.00',
    finePaid: false,
    notes: 'Member reported the copy missing after travel.',
  },
  {
    organizationSlug: 'healthfirst-medical-group',
    bookCopyBarcode: 'HF-EOM-001',
    memberCardNumber: 'HF-0001',
    staffEmail: 'librarian@healthfirst.example.com',
    rentedAt: new Date('2026-01-20'),
    dueDate: new Date('2026-02-03'),
    status: 'OVERDUE',
    fineAmount: '4.50',
    finePaid: false,
  },
];

const RESERVATIONS: ReservationSeed[] = [
  {
    organizationSlug: 'techcorp-solutions',
    bookTitle: 'The Martian',
    memberCardNumber: 'TC-0001',
    reservedAt: new Date('2026-02-03'),
    expiresAt: new Date('2026-02-10'),
    status: 'READY_FOR_PICKUP',
    notifiedAt: new Date('2026-02-04'),
  },
  {
    organizationSlug: 'techcorp-solutions',
    bookTitle: 'The Left Hand of Darkness',
    memberCardNumber: 'TC-0002',
    reservedAt: new Date('2026-01-15'),
    expiresAt: new Date('2026-01-22'),
    status: 'CANCELLED',
    cancelledAt: new Date('2026-01-18'),
  },
  {
    organizationSlug: 'green-energy-partners',
    bookTitle: 'Between the World and Me',
    memberCardNumber: 'GE-0001',
    reservedAt: new Date('2026-01-04'),
    expiresAt: new Date('2026-01-11'),
    status: 'FULFILLED',
    notifiedAt: new Date('2026-01-05'),
    fulfilledAt: new Date('2026-01-06'),
  },
  {
    organizationSlug: 'healthfirst-medical-group',
    bookTitle: 'The Emperor of All Maladies',
    memberCardNumber: 'HF-0001',
    reservedAt: new Date('2026-02-01'),
    expiresAt: new Date('2026-02-08'),
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
