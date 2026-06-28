import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';
import { SeedBranch } from './seedBranches';

type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';

const INQUIRY_COUNT = 15;

const INQUIRY_STATUSES: InquiryStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'ANSWERED',
  'CLOSED',
];

export async function seedInquiries(
  prisma: PrismaClient,
  branches: SeedBranch[],
) {
  console.log('Seeding inquiries...');

  const [clients, medicines] = await Promise.all([
    prisma.user.findMany({ where: { role: 'CLIENT' }, select: { id: true } }),
    prisma.medicine.findMany({ select: { id: true } }),
  ]);

  if (clients.length === 0 || medicines.length === 0 || branches.length === 0) {
    console.log(
      'Inquiries skipped: missing clients, medicines, or branches to link.',
    );
    return;
  }

  const clientIds = clients.map((client) => client.id);
  const medicineIds = medicines.map((medicine) => medicine.id);

  const inquiries = Array.from({ length: INQUIRY_COUNT }, () => {
    // Pick a branch first so the pharmacy/branch pair always stays consistent.
    const branch = faker.helpers.arrayElement(branches);

    return {
      clientId: faker.helpers.arrayElement(clientIds),
      pharmacyId: branch.pharmacyId,
      branchId: branch.id,
      medicineId: faker.helpers.arrayElement(medicineIds),
      status: faker.helpers.arrayElement(INQUIRY_STATUSES),
    };
  });

  await prisma.inquiry.createMany({
    data: inquiries,
  });

  console.log(`Inquiries seeded: ${inquiries.length} total`);
}
