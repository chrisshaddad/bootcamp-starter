import type { PrismaService } from '../../database/prisma.service';

/**
 * The core clinical access gate: a professional may only touch a patient's
 * clinical data (summary, records) when an ACTIVE Assignment links them.
 * Mirrors the "does a care-team row exist?" rule from the feature spec.
 */
export async function isProfessionalAssigned(
  prisma: PrismaService,
  professionalId: string,
  patientId: string,
): Promise<boolean> {
  const assignment = await prisma.assignment.findFirst({
    where: {
      professionalId,
      patientId,
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  return assignment !== null;
}
