import { faker } from '@faker-js/faker';
import { PrismaClient } from '../../src/generated/prisma/client';
import { SeedPharmacy } from './seedPharmacies';
import { SeedBranch } from './seedBranches';

type UserRole =
  | 'SUPER_ADMIN'
  | 'PHARMACY_ADMIN'
  | 'PHARMACY_MANAGER'
  | 'PHARMACY_EMPLOYEE'
  | 'STOCK_MANAGER'
  | 'INQUIRY_OFFICER'
  | 'CLIENT';

const CLIENT_COUNT = 2;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function createUserData(params: {
  firstName: string;
  lastName: string;
  role: UserRole;
  email: string;
  pharmacyId?: string | null;
  branchId?: string | null;
}) {
  return {
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    password: null,
    phoneNumber: faker.phone.number({ style: 'national' }),
    role: params.role,
    status: 'ACTIVE' as const,
    pharmacyId: params.pharmacyId ?? null,
    branchId: params.branchId ?? null,
    dateOfBirth: faker.date.birthdate({
      min: 21,
      max: 65,
      mode: 'age',
    }),
    address: faker.location.streetAddress(true),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
  };
}

export async function seedUsers(
  prisma: PrismaClient,
  pharmacies: SeedPharmacy[],
  branches: SeedBranch[],
) {
  console.log('Seeding users...');

  const users = [
    createUserData({
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      email: 'admin@bootcamp-starter.local',
    }),
  ];

  for (const pharmacy of pharmacies) {
    const pharmacySlug = slugify(pharmacy.name);

    // Branch-level employees always carry a branchId (see employee-role.schema).
    // Attach them to the pharmacy's Main Branch (the first branch seeded), which
    // always has stock — without this a STOCK_MANAGER hits the "not attached to
    // a branch" guard and sees no inventory.
    const mainBranch = branches.find(
      (branch) => branch.pharmacyId === pharmacy.id,
    );

    if (!mainBranch) {
      throw new Error(
        `No branch seeded for pharmacy "${pharmacy.name}" (${pharmacy.id}); ` +
          'seedBranches must run before seedUsers.',
      );
    }

    users.push(
      createUserData({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'PHARMACY_ADMIN',
        email: `admin@${pharmacySlug}.local`,
        pharmacyId: pharmacy.id,
      }),
      createUserData({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'PHARMACY_MANAGER',
        email: `manager@${pharmacySlug}.local`,
        pharmacyId: pharmacy.id,
        branchId: mainBranch.id,
      }),
      createUserData({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'PHARMACY_EMPLOYEE',
        email: `employee@${pharmacySlug}.local`,
        pharmacyId: pharmacy.id,
        branchId: mainBranch.id,
      }),
      createUserData({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'STOCK_MANAGER',
        email: `stock@${pharmacySlug}.local`,
        pharmacyId: pharmacy.id,
        branchId: mainBranch.id,
      }),
      createUserData({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'INQUIRY_OFFICER',
        email: `inquiry@${pharmacySlug}.local`,
        pharmacyId: pharmacy.id,
        branchId: mainBranch.id,
      }),
    );
  }

  for (let index = 0; index < CLIENT_COUNT; index += 1) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push(
      createUserData({
        firstName,
        lastName,
        role: 'CLIENT',
        email: `client.${index + 1}@client.local`,
      }),
    );
  }

  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });

  // createMany skips rows that already exist (matched by email), so on a re-run
  // it never refreshes branchId — and branches are re-created with fresh ids
  // every run. Re-apply each branch-level employee's assignment explicitly.
  for (const user of users) {
    if (!user.branchId) continue;
    await prisma.user.update({
      where: { email: user.email },
      data: { branchId: user.branchId },
    });
  }

  console.log(`Users seeded: ${users.length} total`);
}
