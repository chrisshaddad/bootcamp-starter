import { PrismaClient } from '../../src/generated/prisma/client';

const TECHCORP_ORG_NAME = 'TechCorp Solutions';

interface SkillSeed {
  name: string;
  category: string;
}

// Skills for a software engineering organization
export const SKILLS: SkillSeed[] = [
  // Engineering
  { name: 'JavaScript', category: 'Engineering' },
  { name: 'TypeScript', category: 'Engineering' },
  { name: 'React', category: 'Engineering' },
  { name: 'Node.js', category: 'Engineering' },
  { name: 'Python', category: 'Engineering' },
  { name: 'SQL', category: 'Engineering' },
  { name: 'System Design', category: 'Engineering' },
  { name: 'CI/CD', category: 'Engineering' },
  // Infrastructure
  { name: 'AWS', category: 'Infrastructure' },
  { name: 'Kubernetes', category: 'Infrastructure' },
  { name: 'Docker', category: 'Infrastructure' },
  // Data
  { name: 'Machine Learning', category: 'Data' },
  { name: 'Data Modeling', category: 'Data' },
  // Product & Design
  { name: 'Product Strategy', category: 'Product' },
  { name: 'Roadmapping', category: 'Product' },
  { name: 'User Research', category: 'Product' },
  { name: 'UI Design', category: 'Design' },
  { name: 'Design Systems', category: 'Design' },
  // Leadership
  { name: 'People Management', category: 'Leadership' },
  { name: 'Mentorship', category: 'Leadership' },
  { name: 'Stakeholder Communication', category: 'Leadership' },
];

export async function seedSkills(prisma: PrismaClient) {
  console.log('Seeding skills...');

  const org = await prisma.organization.findFirst({
    where: { name: TECHCORP_ORG_NAME },
  });

  if (!org) {
    console.warn(`  Warning: ${TECHCORP_ORG_NAME} not found. Skipping skills.`);
    return;
  }

  await prisma.skill.createMany({
    data: SKILLS.map((skill) => ({
      ...skill,
      organizationId: org.id,
    })),
  });

  console.log(`Skills seeded: ${SKILLS.length} total for ${org.name}`);
}
