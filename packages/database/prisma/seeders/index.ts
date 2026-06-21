import { PrismaClient } from '../../src/generated/prisma/client';
import { prisma } from '../../src/client';
import { seedSuperAdmins, seedOrgAdmins } from './seedUsers';
import { seedGyms } from './seedGyms';
import { seedInstructors } from './seedInstructors';
import { seedMembers } from './seedMembers';
import { seedPlans } from './seedPlans';
import { seedSubscriptions } from './seedSubscriptions';
import { seedSessions } from './seedSessions';
import { seedBookings } from './seedBookings';
import { seedCheckIns } from './seedCheckIns';

// Delete in reverse dependency order before re-seeding.
// Gym.createdById has RESTRICT so Gyms must be deleted before Users.
async function cleanup(db: PrismaClient) {
  console.log('Cleaning up existing data...');
  await db.checkIn.deleteMany();
  await db.sessionBooking.deleteMany();
  await db.gymSession.deleteMany();
  await db.subscription.deleteMany();
  await db.membershipPlan.deleteMany();
  await db.instructor.deleteMany();
  await db.member.deleteMany();
  await db.gym.deleteMany(); // sets User.gymId → NULL via SET NULL
  await db.user.deleteMany(); // cascades UserProfile, Session, MagicLink
  console.log('Cleanup complete.');
}

async function main() {
  await cleanup(prisma);

  // Users must come first — gyms reference them as createdBy / gymId
  await seedSuperAdmins(prisma);
  await seedOrgAdmins(prisma);

  // Gyms — foundation for all domain models
  await seedGyms(prisma);

  // Domain models in dependency order
  await seedInstructors(prisma);
  await seedMembers(prisma); // creates MEMBER User accounts for portal testing
  await seedPlans(prisma);
  await seedSubscriptions(prisma);
  await seedSessions(prisma);
  await seedBookings(prisma);
  await seedCheckIns(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
