import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';

type SenderType = 'CLIENT' | 'EMPLOYEE';

const MIN_MESSAGES_PER_INQUIRY = 1;
const MAX_MESSAGES_PER_INQUIRY = 5;

export async function seedInquiryMessages(prisma: PrismaClient) {
  console.log('Seeding inquiry messages...');

  const [inquiries, staff] = await Promise.all([
    prisma.inquiry.findMany({
      select: { id: true, clientId: true, pharmacyId: true, status: true },
    }),
    // Pharmacy-attached users can answer inquiries on behalf of their pharmacy.
    prisma.user.findMany({
      where: { pharmacyId: { not: null }, role: { not: 'CLIENT' } },
      select: { id: true, pharmacyId: true },
    }),
  ]);

  if (inquiries.length === 0) {
    console.log('Inquiry messages skipped: no inquiries to attach to.');
    return;
  }

  const staffByPharmacy = new Map<string, string[]>();
  for (const member of staff) {
    if (!member.pharmacyId) continue;
    const existing = staffByPharmacy.get(member.pharmacyId) ?? [];
    existing.push(member.id);
    staffByPharmacy.set(member.pharmacyId, existing);
  }

  const messages = inquiries.flatMap((inquiry) => {
    const pharmacyStaff = staffByPharmacy.get(inquiry.pharmacyId) ?? [];
    // Answered/closed inquiries must contain at least one employee reply. With
    // the alternating order below (index 0 client, index 1 employee), a minimum
    // of two messages guarantees that reply whenever pharmacy staff exist.
    const requiresEmployeeReply =
      pharmacyStaff.length > 0 &&
      (inquiry.status === 'ANSWERED' || inquiry.status === 'CLOSED');
    const messageCount = faker.number.int({
      min: requiresEmployeeReply ? 2 : MIN_MESSAGES_PER_INQUIRY,
      max: MAX_MESSAGES_PER_INQUIRY,
    });

    return Array.from({ length: messageCount }, (_, index) => {
      // Conversations start with the client, then alternate with the pharmacy.
      const fromClient = index % 2 === 0 || pharmacyStaff.length === 0;
      const senderType: SenderType = fromClient ? 'CLIENT' : 'EMPLOYEE';
      const senderId = fromClient
        ? inquiry.clientId
        : faker.helpers.arrayElement(pharmacyStaff);

      return {
        inquiryId: inquiry.id,
        senderId,
        senderType,
        message: faker.lorem.sentence(),
      };
    });
  });

  await prisma.inquiryMessage.createMany({
    data: messages,
  });

  console.log(`Inquiry messages seeded: ${messages.length} total`);
}
