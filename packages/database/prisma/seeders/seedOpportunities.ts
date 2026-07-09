import { PrismaClient } from '../../src/generated/prisma/client';

interface OpportunitySeed {
  title: string;
  type: string;
  description: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED';
  deadlineDaysFromNow: number | null;
  requiredLevel: number | null;
  departmentName: string;
  hiringManagerEmail: string;
  orgAdminEmail: string;
  requiredSkills: { skillName: string; requiredLevel: number }[];
}

const TECHCORP_OPPORTUNITIES: OpportunitySeed[] = [
  {
    title: 'Senior Full-Stack Engineer',
    type: 'Role',
    description:
      'Join the platform team to build next-generation APIs and React interfaces for our enterprise clients. You will lead feature development end-to-end and mentor junior engineers.',
    status: 'OPEN',
    deadlineDaysFromNow: 30,
    requiredLevel: 4,
    departmentName: 'Engineering',
    hiringManagerEmail: 'lisa.wang@techcorp.example.com',
    orgAdminEmail: 'admin@techcorp.example.com',
    requiredSkills: [
      { skillName: 'TypeScript', requiredLevel: 4 },
      { skillName: 'React', requiredLevel: 4 },
      { skillName: 'Node.js', requiredLevel: 3 },
      { skillName: 'SQL', requiredLevel: 3 },
    ],
  },
  {
    title: 'Cloud Migration Project',
    type: 'Project',
    description:
      'A 3-month cross-functional project to migrate our on-premise data pipelines to AWS. Looking for engineers with strong cloud and containerization skills.',
    status: 'OPEN',
    deadlineDaysFromNow: 14,
    requiredLevel: 3,
    departmentName: 'Engineering',
    hiringManagerEmail: 'lisa.wang@techcorp.example.com',
    orgAdminEmail: 'admin@techcorp.example.com',
    requiredSkills: [
      { skillName: 'AWS', requiredLevel: 4 },
      { skillName: 'Docker', requiredLevel: 3 },
      { skillName: 'Python', requiredLevel: 3 },
    ],
  },
  {
    title: 'Product Team Rotation',
    type: 'Rotation',
    description:
      'A 6-month rotation into the Product team for engineers looking to explore product management. You will shadow a PM and own a small feature from ideation to launch.',
    status: 'OPEN',
    deadlineDaysFromNow: 45,
    requiredLevel: 3,
    departmentName: 'Product',
    hiringManagerEmail: 'james.park@techcorp.example.com',
    orgAdminEmail: 'admin@techcorp.example.com',
    requiredSkills: [
      { skillName: 'Communication', requiredLevel: 3 },
      { skillName: 'Agile', requiredLevel: 2 },
      { skillName: 'Data Analysis', requiredLevel: 2 },
    ],
  },
  {
    title: 'UX Research Lead',
    type: 'Role',
    description:
      'Lead user research initiatives across the design team. Conduct usability studies, synthesize findings, and drive design decisions with data.',
    status: 'DRAFT',
    deadlineDaysFromNow: null,
    requiredLevel: 4,
    departmentName: 'Design',
    hiringManagerEmail: 'james.park@techcorp.example.com',
    orgAdminEmail: 'admin@techcorp.example.com',
    requiredSkills: [
      { skillName: 'UX Design', requiredLevel: 4 },
      { skillName: 'Data Analysis', requiredLevel: 3 },
      { skillName: 'Communication', requiredLevel: 4 },
    ],
  },
  {
    title: 'API Platform Engineer',
    type: 'Role',
    description:
      'Build and maintain our GraphQL API layer that powers all client-facing products. Strong backend skills required.',
    status: 'OPEN',
    deadlineDaysFromNow: 21,
    requiredLevel: 3,
    departmentName: 'Engineering',
    hiringManagerEmail: 'lisa.wang@techcorp.example.com',
    orgAdminEmail: 'admin@techcorp.example.com',
    requiredSkills: [
      { skillName: 'GraphQL', requiredLevel: 3 },
      { skillName: 'Node.js', requiredLevel: 4 },
      { skillName: 'TypeScript', requiredLevel: 3 },
      { skillName: 'SQL', requiredLevel: 3 },
    ],
  },
];

const GREEN_ENERGY_OPPORTUNITIES: OpportunitySeed[] = [
  {
    title: 'Senior Solar Engineer',
    type: 'Role',
    description:
      'Design and validate large-scale commercial solar installations. Requires hands-on experience with PV system design and electrical engineering fundamentals.',
    status: 'OPEN',
    deadlineDaysFromNow: 30,
    requiredLevel: 4,
    departmentName: 'R&D',
    hiringManagerEmail: 'fatima.hassan@greenenergy.example.com',
    orgAdminEmail: 'admin@greenenergy.example.com',
    requiredSkills: [
      { skillName: 'Solar Engineering', requiredLevel: 4 },
      { skillName: 'Electrical Engineering', requiredLevel: 3 },
      { skillName: 'AutoCAD', requiredLevel: 3 },
    ],
  },
  {
    title: 'Wind Farm Site Assessment Project',
    type: 'Project',
    description:
      'A 4-month project to assess three potential wind farm sites in the Midwest. Involves GIS analysis, wind data modeling, and regulatory review.',
    status: 'OPEN',
    deadlineDaysFromNow: 20,
    requiredLevel: 3,
    departmentName: 'R&D',
    hiringManagerEmail: 'fatima.hassan@greenenergy.example.com',
    orgAdminEmail: 'admin@greenenergy.example.com',
    requiredSkills: [
      { skillName: 'Wind Turbine Design', requiredLevel: 3 },
      { skillName: 'GIS', requiredLevel: 3 },
      { skillName: 'Data Analysis', requiredLevel: 3 },
      { skillName: 'Regulatory Compliance', requiredLevel: 2 },
    ],
  },
  {
    title: 'Operations Team Rotation',
    type: 'Rotation',
    description:
      'A 6-month rotation for R&D engineers to gain field experience in project operations, site logistics, and installation oversight.',
    status: 'OPEN',
    deadlineDaysFromNow: 60,
    requiredLevel: 2,
    departmentName: 'Operations',
    hiringManagerEmail: 'david.oconnor@greenenergy.example.com',
    orgAdminEmail: 'admin@greenenergy.example.com',
    requiredSkills: [
      { skillName: 'Project Management', requiredLevel: 2 },
      { skillName: 'Communication', requiredLevel: 3 },
    ],
  },
  {
    title: 'Sustainability Reporting Analyst',
    type: 'Role',
    description:
      'Own the company\'s ESG reporting process, ensuring compliance with federal and state renewable energy regulations.',
    status: 'OPEN',
    deadlineDaysFromNow: 25,
    requiredLevel: 3,
    departmentName: 'Finance',
    hiringManagerEmail: 'david.oconnor@greenenergy.example.com',
    orgAdminEmail: 'admin@greenenergy.example.com',
    requiredSkills: [
      { skillName: 'Sustainability Reporting', requiredLevel: 3 },
      { skillName: 'Regulatory Compliance', requiredLevel: 3 },
      { skillName: 'Financial Modeling', requiredLevel: 2 },
    ],
  },
  {
    title: 'Energy Data Scientist',
    type: 'Role',
    description:
      'Analyze production data from solar and wind installations to optimize output and predict maintenance needs.',
    status: 'CLOSED',
    deadlineDaysFromNow: null,
    requiredLevel: 3,
    departmentName: 'R&D',
    hiringManagerEmail: 'fatima.hassan@greenenergy.example.com',
    orgAdminEmail: 'admin@greenenergy.example.com',
    requiredSkills: [
      { skillName: 'Python', requiredLevel: 4 },
      { skillName: 'Data Analysis', requiredLevel: 4 },
      { skillName: 'GIS', requiredLevel: 2 },
    ],
  },
];

async function seedOpportunitiesForOrg(
  prisma: PrismaClient,
  opportunities: OpportunitySeed[],
) {
  const orgAdminEmail = opportunities[0]!.orgAdminEmail;
  const orgAdmin = await prisma.user.findUnique({
    where: { email: orgAdminEmail },
  });

  if (!orgAdmin?.organizationId) {
    console.warn(`  Skipping opportunities: org admin ${orgAdminEmail} not found.`);
    return;
  }

  const orgId = orgAdmin.organizationId;

  const departments = await prisma.department.findMany({
    where: { organizationId: orgId },
  });
  const deptMap = new Map(departments.map((d) => [d.name, d.id]));

  const skills = await prisma.skill.findMany({
    where: { organizationId: orgId },
  });
  const skillMap = new Map(skills.map((s) => [s.name, s.id]));

  for (const opp of opportunities) {
    const hiringManager = await prisma.user.findUnique({
      where: { email: opp.hiringManagerEmail },
    });

    const deadline = opp.deadlineDaysFromNow
      ? new Date(Date.now() + opp.deadlineDaysFromNow * 24 * 60 * 60 * 1000)
      : null;

    const opportunity = await prisma.opportunity.create({
      data: {
        title: opp.title,
        type: opp.type,
        description: opp.description,
        status: opp.status,
        deadline,
        requiredLevel: opp.requiredLevel,
        organizationId: orgId,
        departmentId: deptMap.get(opp.departmentName) || null,
        hiringManagerId: hiringManager?.id || null,
      },
    });

    // Create required skills
    for (const rs of opp.requiredSkills) {
      const skillId = skillMap.get(rs.skillName);
      if (skillId) {
        await prisma.opportunitySkill.create({
          data: {
            opportunityId: opportunity.id,
            skillId,
            requiredLevel: rs.requiredLevel,
          },
        });
      }
    }

    console.log(`  Created opportunity: ${opp.title} (${opp.status})`);
  }
}

export async function seedOpportunities(prisma: PrismaClient) {
  console.log('Seeding opportunities...');
  await seedOpportunitiesForOrg(prisma, TECHCORP_OPPORTUNITIES);
  await seedOpportunitiesForOrg(prisma, GREEN_ENERGY_OPPORTUNITIES);
  console.log('Opportunities seeded.');
}
