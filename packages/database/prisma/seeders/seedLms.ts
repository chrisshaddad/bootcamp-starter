import { PrismaClient } from '../../src/generated/prisma/client';

export async function seedLms(prisma: PrismaClient) {
  const superAdmin = await prisma.user.findUnique({
    where: {
      email: 'admin@bootcamp-starter.local',
    },
  });

  if (!superAdmin) {
    throw new Error('Super Admin user not found. Run seedUsers first.');
  }

  const organization = await prisma.organization.findFirst();

  const gradeLevel = await prisma.gradeLevel.upsert({
    where: { name: 'Grade 9' },
    update: {},
    create: {
      name: 'Grade 9',
    },
  });

  const section = await prisma.section.upsert({
    where: {
      gradeLevelId_name: {
        gradeLevelId: gradeLevel.id,
        name: 'Section A',
      },
    },
    update: {},
    create: {
      gradeLevelId: gradeLevel.id,
      name: 'Section A',
    },
  });

  const subject = await prisma.subject.upsert({
    where: { name: 'Mathematics' },
    update: {},
    create: {
      name: 'Mathematics',
      code: 'MATH-9',
    },
  });

  const course = await prisma.course.upsert({
    where: {
      joinCode: 'MATH9A',
    },
    update: {},
    create: {
      teacherId: superAdmin.id,
      subjectId: subject.id,
      sectionId: section.id,
      organizationId: organization?.id,
      title: 'Mathematics - Grade 9 Section A',
      description: 'Sample LMS course for Grade 9 Section A.',
      joinCode: 'MATH9A',
      status: 'published',
    },
  });

  await prisma.enrollment.upsert({
    where: {
      courseId_studentId: {
        courseId: course.id,
        studentId: superAdmin.id,
      },
    },
    update: {},
    create: {
      courseId: course.id,
      studentId: superAdmin.id,
      status: 'active',
    },
  });

  await prisma.$transaction(async (tx) => {
    let existingAssignment = await tx.assignment.findFirst({
      where: {
        courseId: course.id,
        title: 'Sample Algebra Quiz',
      },
    });

    if (!existingAssignment) {
      existingAssignment = await tx.assignment.create({
        data: {
          courseId: course.id,
          createdById: superAdmin.id,
          type: 'quiz',
          title: 'Sample Algebra Quiz',
          instructions: 'Answer the following sample question.',
          maxScore: 10,
          status: 'published',
        },
      });
    }

    const existingQuestion = await tx.quizQuestion.findFirst({
      where: {
        assignmentId: existingAssignment.id,
        position: 1,
      },
    });

    if (!existingQuestion) {
      await tx.quizQuestion.create({
        data: {
          assignmentId: existingAssignment.id,
          questionText: 'What is 2 + 2?',
          questionType: 'mcq',
          options: [
            { id: 'A', text: '3' },
            { id: 'B', text: '4' },
            { id: 'C', text: '5' },
          ],
          correctAnswer: { selectedOptionId: 'B' },
          points: 10,
          position: 1,
        },
      });
    }
  });
}
