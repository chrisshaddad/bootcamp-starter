import { PrismaClient } from '../../src/generated/prisma/client';

const DEMO_STUDENTS = [
  {
    name: 'Mia Farchoukh',
    email: 'mia@student.local',
    className: 'Grade 9',
    sectionName: 'A',
    dateOfBirth: '2009-02-22',
    studentCode: 'STU-0001',
    phoneNumber: '+96170000001',
  },
  {
    name: 'Adam Khoury',
    email: 'adam@student.local',
    className: 'Grade 9',
    sectionName: 'A',
    dateOfBirth: '2009-05-14',
    studentCode: 'STU-0002',
    phoneNumber: '+96170000002',
  },
  {
    name: 'Lea Haddad',
    email: 'lea@student.local',
    className: 'Grade 9',
    sectionName: 'B',
    dateOfBirth: '2009-09-10',
    studentCode: 'STU-0003',
    phoneNumber: '+96170000003',
  },
  {
    name: 'Karim Mansour',
    email: 'karim@student.local',
    className: 'Grade 10',
    sectionName: 'A',
    dateOfBirth: '2008-01-12',
    studentCode: 'STU-0004',
    phoneNumber: '+96170000004',
  },
  {
    name: 'Nour Saliba',
    email: 'nour@student.local',
    className: 'Grade 10',
    sectionName: 'C',
    dateOfBirth: '2008-07-20',
    studentCode: 'STU-0005',
    phoneNumber: '+96170000005',
  },
  {
    name: 'Elie Nader',
    email: 'elie@student.local',
    className: 'Grade 11',
    sectionName: 'B',
    dateOfBirth: '2007-03-18',
    studentCode: 'STU-0006',
    phoneNumber: '+96170000006',
  },
];

export async function seedLms(prisma: PrismaClient) {
  console.log('Seeding LMS demo students...');

  const organization = await prisma.organization.findFirst({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!organization) {
    console.warn('No active organization found. Skipping LMS student seed.');
    return;
  }

  for (const student of DEMO_STUDENTS) {
    await prisma.$transaction(async (tx) => {
      const gradeLevel = await tx.gradeLevel.upsert({
        where: {
          name: student.className,
        },
        update: {},
        create: {
          name: student.className,
        },
      });

      const section = await tx.section.upsert({
        where: {
          gradeLevelId_name: {
            gradeLevelId: gradeLevel.id,
            name: student.sectionName,
          },
        },
        update: {},
        create: {
          gradeLevelId: gradeLevel.id,
          name: student.sectionName,
        },
      });

      const user = await tx.user.upsert({
        where: {
          email: student.email,
        },
        update: {
          name: student.name,
          role: 'MEMBER',
          organizationId: organization.id,
          isConfirmed: true,
        },
        create: {
          name: student.name,
          email: student.email,
          role: 'MEMBER',
          organizationId: organization.id,
          isConfirmed: true,
        },
      });

      await tx.userProfile.upsert({
        where: {
          userId: user.id,
        },
        update: {
          dateOfBirth: new Date(student.dateOfBirth),
          phoneNumber: student.phoneNumber,
          city: 'Beirut',
          country: 'Lebanon',
        },
        create: {
          userId: user.id,
          dateOfBirth: new Date(student.dateOfBirth),
          phoneNumber: student.phoneNumber,
          city: 'Beirut',
          country: 'Lebanon',
        },
      });

      await tx.studentProfile.upsert({
        where: {
          studentCode: student.studentCode,
        },
        update: {
          userId: user.id,
          sectionId: section.id,
          dateOfBirth: new Date(student.dateOfBirth),
        },
        create: {
          userId: user.id,
          studentCode: student.studentCode,
          sectionId: section.id,
          dateOfBirth: new Date(student.dateOfBirth),
        },
      });
    });
  }

  console.log('LMS demo students seeded.');
}
