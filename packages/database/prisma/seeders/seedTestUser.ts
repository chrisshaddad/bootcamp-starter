/**
 * One-off script: seeds 25 members + 25 plans for gymtest4@gmail.com.
 * Deletes only that gym's existing members and plans first.
 * Run: npx tsx prisma/seeders/seedTestUser.ts
 */
import { prisma } from '../../src/client';

const TARGET_EMAIL = 'gymtest4@gmail.com';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) throw new Error(`User ${TARGET_EMAIL} not found`);
  if (!user.gymId) throw new Error(`User ${TARGET_EMAIL} has no gymId`);

  const gymId = user.gymId;
  console.log(`Targeting gym ${gymId} for ${TARGET_EMAIL}`);

  // Clean only this gym's members and plans
  const deletedMembers = await prisma.member.deleteMany({ where: { gymId } });
  const deletedPlans = await prisma.membershipPlan.deleteMany({
    where: { gymId },
  });
  console.log(
    `Deleted ${deletedMembers.count} members, ${deletedPlans.count} plans`,
  );

  // Seed 25 members
  const firstNames = [
    'Alice',
    'Bob',
    'Carol',
    'David',
    'Eve',
    'Frank',
    'Grace',
    'Henry',
    'Iris',
    'Jack',
    'Karen',
    'Liam',
    'Mia',
    'Noah',
    'Olivia',
    'Paul',
    'Quinn',
    'Rachel',
    'Sam',
    'Tina',
    'Uma',
    'Victor',
    'Wendy',
    'Xander',
    'Yara',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Wilson',
    'Moore',
    'Taylor',
    'Anderson',
    'Thomas',
    'Jackson',
    'White',
    'Harris',
    'Martin',
    'Thompson',
    'Robinson',
    'Clark',
    'Lewis',
    'Lee',
    'Walker',
    'Hall',
    'Allen',
  ];

  for (let i = 0; i < 25; i++) {
    await prisma.member.create({
      data: {
        gymId,
        name: `${firstNames[i]} ${lastNames[i]}`,
        email: `testmember${i + 1}@gymtest4.local`,
        phoneNumber: `+1555${String(1000 + i).padStart(4, '0')}`,
        status: i % 5 === 4 ? 'INACTIVE' : 'ACTIVE',
        joinedAt: new Date(2025, i % 12, (i % 28) + 1),
      },
    });
  }
  console.log('Created 25 members');

  // Seed 25 plans
  const planTemplates = [
    { name: 'Daily Drop-in', days: 1, price: 1500 },
    { name: 'Weekly Pass', days: 7, price: 4999 },
    { name: 'Bi-Weekly', days: 14, price: 8999 },
    { name: 'Monthly Basic', days: 30, price: 2999 },
    { name: 'Monthly Standard', days: 30, price: 4999 },
    { name: 'Monthly Premium', days: 30, price: 6999 },
    { name: 'Monthly Elite', days: 30, price: 9999 },
    { name: '6-Week Kickstart', days: 42, price: 11999 },
    { name: 'Quarterly Basic', days: 90, price: 7999 },
    { name: 'Quarterly Standard', days: 90, price: 12999 },
    { name: 'Quarterly Premium', days: 90, price: 17999 },
    { name: '6-Month Basic', days: 180, price: 14999 },
    { name: '6-Month Standard', days: 180, price: 22999 },
    { name: '6-Month Premium', days: 180, price: 29999 },
    { name: 'Annual Basic', days: 365, price: 24999 },
    { name: 'Annual Standard', days: 365, price: 34999 },
    { name: 'Annual Premium', days: 365, price: 44999 },
    { name: 'Annual Elite', days: 365, price: 59999 },
    { name: 'Student Monthly', days: 30, price: 1999 },
    { name: 'Student Quarterly', days: 90, price: 4999 },
    { name: 'Senior Monthly', days: 30, price: 1999 },
    { name: 'Family Monthly', days: 30, price: 8999 },
    { name: 'Family Annual', days: 365, price: 79999 },
    { name: 'Corporate Monthly', days: 30, price: 3999 },
    { name: 'Corporate Annual', days: 365, price: 39999 },
  ];

  for (let i = 0; i < planTemplates.length; i++) {
    const t = planTemplates[i]!;
    await prisma.membershipPlan.create({
      data: {
        gymId,
        name: t.name,
        description: `${t.name} plan — ${t.days} day${t.days > 1 ? 's' : ''} of full gym access.`,
        durationDays: t.days,
        price: t.price,
        isActive: i !== 24, // last one inactive to test filter
      },
    });
  }
  console.log('Created 25 plans');
  console.log('Done!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
