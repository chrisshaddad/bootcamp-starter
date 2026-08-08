import type { PrismaService } from '../database/prisma.service';

const STAFF_ROLES = ['ORG_ADMIN', 'LIBRARIAN'] as const;

export async function getOrganizationStaffEmails(
  prisma: PrismaService,
  organizationId: string,
): Promise<string[]> {
  const staff = await prisma.user.findMany({
    where: {
      organizationId,
      role: { in: [...STAFF_ROLES] },
    },
    select: { email: true },
  });

  return staff.map((user) => user.email);
}

export async function getMemberContact(
  prisma: PrismaService,
  organizationId: string,
  memberId: string,
): Promise<{
  name: string | null;
  email: string | null;
  libraryCardNumber: string;
}> {
  const member = await prisma.libraryMember.findFirst({
    where: { id: memberId, organizationId },
    select: {
      libraryCardNumber: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!member) {
    return {
      name: null,
      email: null,
      libraryCardNumber: '',
    };
  }

  return {
    name: member.user?.name ?? null,
    email: member.user?.email ?? null,
    libraryCardNumber: member.libraryCardNumber,
  };
}
