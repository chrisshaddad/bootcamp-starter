import { PrismaClient } from '../../src/generated/prisma/client';

interface SubscriptionSeed {
  gymName: string;
  memberEmail: string;
  planName: string | null; // null → manually-priced (no plan FK)
  price: number; // snapshot price in cents
  startDate: Date;
  endDate: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

const SUBSCRIPTIONS: SubscriptionSeed[] = [
  // Iron Peak Fitness
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'alex.johnson@example.com',
    planName: 'Monthly',
    price: 4999,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-30'),
    status: 'ACTIVE',
  },
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'maria.smith@example.com',
    planName: 'Quarterly',
    price: 12999,
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-07-31'),
    status: 'ACTIVE',
  },
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'david.park@example.com',
    planName: 'Monthly',
    price: 4999,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    status: 'EXPIRED',
  },
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'emma.wilson@example.com',
    planName: 'Annual',
    price: 39999,
    startDate: new Date('2025-10-01'),
    endDate: new Date('2026-09-30'),
    status: 'ACTIVE',
  },
  // FlexZone Gym
  {
    gymName: 'FlexZone Gym',
    memberEmail: 'james.brown@example.com',
    planName: 'Starter Monthly',
    price: 5499,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-30'),
    status: 'ACTIVE',
  },
  {
    gymName: 'FlexZone Gym',
    memberEmail: 'sofia.rodriguez@example.com',
    planName: 'Annual',
    price: 44999,
    startDate: new Date('2026-01-10'),
    endDate: new Date('2027-01-09'),
    status: 'ACTIVE',
  },
  {
    gymName: 'FlexZone Gym',
    memberEmail: 'liam.chen@example.com',
    planName: 'Starter Monthly',
    price: 5499,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-28'),
    status: 'CANCELLED',
  },
  // ProFit Training — manually-priced (no plan), gym was suspended before plans were formalised
  {
    gymName: 'ProFit Training',
    memberEmail: 'kenji.tanaka@example.com',
    planName: null,
    price: 6000, // bespoke deal: $60/month
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-07-31'),
    status: 'ACTIVE',
  },
  {
    gymName: 'ProFit Training',
    memberEmail: 'priya.patel@example.com',
    planName: null,
    price: 6000,
    startDate: new Date('2025-09-15'),
    endDate: new Date('2025-10-15'),
    status: 'EXPIRED',
  },
];

/** Auto-generated docstring */
export async function seedSubscriptions(prisma: PrismaClient) {
  console.log('Seeding subscriptions...');

  let count = 0;
  for (const sub of SUBSCRIPTIONS) {
    const gym = await prisma.gym.findFirst({ where: { name: sub.gymName } });
    if (!gym) {
      console.warn(`  Warning: Gym "${sub.gymName}" not found. Skipping.`);
      continue;
    }

    const member = await prisma.member.findFirst({
      where: { gymId: gym.id, email: sub.memberEmail },
    });
    if (!member) {
      console.warn(
        `  Warning: Member ${sub.memberEmail} not found in ${sub.gymName}. Skipping.`,
      );
      continue;
    }

    let planId: string | null = null;
    if (sub.planName) {
      const plan = await prisma.membershipPlan.findFirst({
        where: { gymId: gym.id, name: sub.planName },
      });
      if (!plan) {
        console.warn(
          `  Warning: Plan "${sub.planName}" not found in ${sub.gymName}. Creating without plan FK.`,
        );
      } else {
        planId = plan.id;
      }
    }

    await prisma.subscription.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        planId,
        price: sub.price,
        startDate: sub.startDate,
        endDate: sub.endDate,
        status: sub.status,
      },
    });

    console.log(
      `  Created subscription: ${sub.memberEmail} → ${sub.planName ?? 'custom'} (${sub.status})`,
    );
    count++;
  }

  console.log(`Subscriptions seeded: ${count} total`);
}
