import { PrismaClient } from '../../src/generated/prisma/client';

interface PlanSeed {
  gymName: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: number; // minor units (cents)
  isActive: boolean;
}

// Plans only for ACTIVE gyms
const PLANS: PlanSeed[] = [
  // Iron Peak Fitness
  {
    gymName: 'Iron Peak Fitness',
    name: 'Monthly',
    description: 'Full gym access for one month. Includes all group classes.',
    durationDays: 30,
    price: 4999, // $49.99
    isActive: true,
  },
  {
    gymName: 'Iron Peak Fitness',
    name: 'Quarterly',
    description: 'Three-month membership with a 13% saving over monthly.',
    durationDays: 90,
    price: 12999, // $129.99
    isActive: true,
  },
  {
    gymName: 'Iron Peak Fitness',
    name: 'Annual',
    description:
      'Full-year membership at the best value. Includes personal training consultation.',
    durationDays: 365,
    price: 39999, // $399.99
    isActive: true,
  },
  // FlexZone Gym
  {
    gymName: 'FlexZone Gym',
    name: 'Starter Monthly',
    description: 'Month-to-month access with no lock-in contract.',
    durationDays: 30,
    price: 5499, // $54.99
    isActive: true,
  },
  {
    gymName: 'FlexZone Gym',
    name: 'Annual',
    description: 'Best value 12-month plan. Includes two guest passes.',
    durationDays: 365,
    price: 44999, // $449.99
    isActive: true,
  },
  {
    gymName: 'FlexZone Gym',
    name: 'Day Pass',
    description: null,
    durationDays: 1,
    price: 1500, // $15.00
    isActive: false, // retired plan
  },
];

/** Auto-generated docstring */
export async function seedPlans(prisma: PrismaClient) {
  console.log('Seeding membership plans...');

  let count = 0;
  for (const plan of PLANS) {
    const gym = await prisma.gym.findFirst({
      where: { name: plan.gymName },
    });

    if (!gym) {
      console.warn(
        `  Warning: Gym "${plan.gymName}" not found. Skipping plan ${plan.name}.`,
      );
      continue;
    }

    await prisma.membershipPlan.create({
      data: {
        gymId: gym.id,
        name: plan.name,
        description: plan.description,
        durationDays: plan.durationDays,
        price: plan.price,
        isActive: plan.isActive,
      },
    });

    console.log(
      `  Created plan: ${plan.name} (${plan.gymName}) — $${(plan.price / 100).toFixed(2)} / ${plan.durationDays}d`,
    );
    count++;
  }

  console.log(`Membership plans seeded: ${count} total`);
}
