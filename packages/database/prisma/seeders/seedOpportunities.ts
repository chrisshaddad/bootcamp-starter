import { PrismaClient } from '../../src/generated/prisma/client';

const TECHCORP_ORG_NAME = 'TechCorp Solutions';

interface OpportunitySeed {
  title: string;
  type: 'ROLE' | 'PROJECT' | 'ROTATION';
  department: string;
  description: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED';
  deadline: Date | null;
  requiredLevel: number;
  hiringManagerEmail: string;
  requiredSkills: { name: string; requiredLevel: number }[];
}

const OPPORTUNITIES: OpportunitySeed[] = [
  {
    title: 'Engineering Manager – Growth',
    type: 'ROLE',
    department: 'Engineering',
    description:
      'Lead a team of 6-8 engineers focused on growth and monetization. Partner with product and data science to drive experiments and increase key metrics.',
    status: 'OPEN',
    deadline: new Date('2026-08-15'),
    requiredLevel: 4,
    hiringManagerEmail: 'priya.nair@techcorp.example.com',
    requiredSkills: [
      { name: 'People Management', requiredLevel: 4 },
      { name: 'System Design', requiredLevel: 4 },
      { name: 'JavaScript', requiredLevel: 3 },
      { name: 'Stakeholder Communication', requiredLevel: 3 },
    ],
  },
  {
    title: 'AI/ML Platform Engineer',
    type: 'PROJECT',
    department: 'Data Science',
    description:
      '6-month project to build internal ML tooling and model serving infrastructure. Collaborate with data scientists to deploy production ML pipelines.',
    status: 'OPEN',
    deadline: new Date('2026-08-01'),
    requiredLevel: 3,
    hiringManagerEmail: 'dana.osei@techcorp.example.com',
    requiredSkills: [
      { name: 'Python', requiredLevel: 4 },
      { name: 'Machine Learning', requiredLevel: 4 },
      { name: 'SQL', requiredLevel: 3 },
      { name: 'AWS', requiredLevel: 2 },
    ],
  },
  {
    title: 'Product Manager Rotation – Mobile',
    type: 'ROTATION',
    department: 'Product',
    description:
      '3-month rotation on the mobile product team. Experience the full product lifecycle from discovery to launch for our mobile apps.',
    status: 'OPEN',
    deadline: new Date('2026-09-01'),
    requiredLevel: 4,
    hiringManagerEmail: 'morgan.diaz@techcorp.example.com',
    requiredSkills: [
      { name: 'Product Strategy', requiredLevel: 3 },
      { name: 'Roadmapping', requiredLevel: 3 },
      { name: 'User Research', requiredLevel: 3 },
      { name: 'Stakeholder Communication', requiredLevel: 3 },
    ],
  },
  {
    title: 'Senior Backend Engineer – Payments',
    type: 'ROLE',
    department: 'Engineering',
    description:
      'Own the payments processing service handling millions of transactions a day. Drive reliability, scalability, and correctness improvements.',
    status: 'OPEN',
    deadline: new Date('2026-08-20'),
    requiredLevel: 4,
    hiringManagerEmail: 'priya.nair@techcorp.example.com',
    requiredSkills: [
      { name: 'Node.js', requiredLevel: 4 },
      { name: 'SQL', requiredLevel: 4 },
      { name: 'System Design', requiredLevel: 4 },
      { name: 'AWS', requiredLevel: 3 },
    ],
  },
  {
    title: 'Staff Site Reliability Engineer',
    type: 'ROLE',
    department: 'Platform',
    description:
      'Define and drive the reliability roadmap across our production Kubernetes fleet. Mentor engineers on operational excellence.',
    status: 'OPEN',
    deadline: new Date('2026-08-25'),
    requiredLevel: 5,
    hiringManagerEmail: 'taylor.brooks@techcorp.example.com',
    requiredSkills: [
      { name: 'Kubernetes', requiredLevel: 5 },
      { name: 'AWS', requiredLevel: 4 },
      { name: 'CI/CD', requiredLevel: 4 },
      { name: 'System Design', requiredLevel: 4 },
    ],
  },
  {
    title: 'Frontend Engineering Rotation – Design Systems',
    type: 'ROTATION',
    department: 'Engineering',
    description:
      '3-month rotation building and extending our shared component library alongside the design team.',
    status: 'OPEN',
    deadline: new Date('2026-09-10'),
    requiredLevel: 2,
    hiringManagerEmail: 'priya.nair@techcorp.example.com',
    requiredSkills: [
      { name: 'React', requiredLevel: 3 },
      { name: 'TypeScript', requiredLevel: 3 },
      { name: 'Design Systems', requiredLevel: 2 },
      { name: 'UI Design', requiredLevel: 2 },
    ],
  },
  {
    title: 'Data Platform Migration',
    type: 'PROJECT',
    department: 'Data Science',
    description:
      'Completed project to migrate the legacy analytics warehouse onto the new data platform.',
    status: 'CLOSED',
    deadline: new Date('2026-06-01'),
    requiredLevel: 3,
    hiringManagerEmail: 'dana.osei@techcorp.example.com',
    requiredSkills: [
      { name: 'Python', requiredLevel: 3 },
      { name: 'SQL', requiredLevel: 4 },
      { name: 'AWS', requiredLevel: 3 },
    ],
  },
  {
    title: 'Mentorship Rotation – New Grad Program',
    type: 'ROTATION',
    department: 'Engineering',
    description:
      'A 2-month pairing rotation for new grads to ramp up on the codebase with a dedicated mentor. Position has been filled for this cohort.',
    status: 'FILLED',
    deadline: new Date('2026-05-15'),
    requiredLevel: 1,
    hiringManagerEmail: 'priya.nair@techcorp.example.com',
    requiredSkills: [
      { name: 'Mentorship', requiredLevel: 2 },
      { name: 'JavaScript', requiredLevel: 1 },
    ],
  },
];

interface ApplicationSeed {
  employeeEmail: string;
  opportunityTitle: string;
  status:
    | 'PENDING'
    | 'MANAGER_REVIEW'
    | 'UNDER_REVIEW'
    | 'SHORTLISTED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'WITHDRAWN';
  coverNote: string;
}

const APPLICATIONS: ApplicationSeed[] = [
  {
    employeeEmail: 'jordan.lee@techcorp.example.com',
    opportunityTitle: 'AI/ML Platform Engineer',
    status: 'UNDER_REVIEW',
    coverNote:
      "I've been picking up Python and ML fundamentals on the side and would love to bring that into a full-time project.",
  },
  {
    employeeEmail: 'riley.chen@techcorp.example.com',
    opportunityTitle: 'Frontend Engineering Rotation – Design Systems',
    status: 'PENDING',
    coverNote:
      'I work closely with the design team already and want to help formalize our component library.',
  },
];

export async function seedOpportunities(prisma: PrismaClient) {
  console.log('Seeding TechCorp opportunities...');

  const org = await prisma.organization.findFirst({
    where: { name: TECHCORP_ORG_NAME },
  });

  if (!org) {
    console.warn(
      `  Warning: ${TECHCORP_ORG_NAME} not found. Skipping opportunities.`,
    );
    return;
  }

  const opportunityIdByTitle = new Map<string, string>();

  for (const opportunity of OPPORTUNITIES) {
    const department = await prisma.department.findFirstOrThrow({
      where: { name: opportunity.department, organizationId: org.id },
    });
    const hiringManager = await prisma.user.findUniqueOrThrow({
      where: { email: opportunity.hiringManagerEmail },
    });

    const created = await prisma.opportunity.create({
      data: {
        title: opportunity.title,
        type: opportunity.type,
        description: opportunity.description,
        status: opportunity.status,
        deadline: opportunity.deadline,
        requiredLevel: opportunity.requiredLevel,
        organizationId: org.id,
        departmentId: department.id,
        hiringManagerId: hiringManager.id,
      },
    });
    opportunityIdByTitle.set(opportunity.title, created.id);

    await prisma.opportunitySkill.createMany({
      data: await Promise.all(
        opportunity.requiredSkills.map(async (skill) => {
          const skillRecord = await prisma.skill.findFirstOrThrow({
            where: { name: skill.name, organizationId: org.id },
          });
          return {
            opportunityId: created.id,
            skillId: skillRecord.id,
            requiredLevel: skill.requiredLevel,
          };
        }),
      ),
    });
  }

  for (const application of APPLICATIONS) {
    const employee = await prisma.user.findUniqueOrThrow({
      where: { email: application.employeeEmail },
    });
    const opportunityId = opportunityIdByTitle.get(
      application.opportunityTitle,
    );
    if (!opportunityId) {
      throw new Error(
        `Unknown opportunity title in APPLICATIONS seed: "${application.opportunityTitle}"`,
      );
    }

    await prisma.application.create({
      data: {
        userId: employee.id,
        opportunityId,
        status: application.status,
        coverNote: application.coverNote,
      },
    });
  }

  console.log(
    `Opportunities seeded: ${OPPORTUNITIES.length}, applications seeded: ${APPLICATIONS.length} for ${org.name}`,
  );
}
