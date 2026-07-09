import { PrismaClient } from '../../src/generated/prisma/client';

interface SkillSeed {
  name: string;
  category: string;
}

const TECHCORP_SKILLS: SkillSeed[] = [
  { name: 'JavaScript', category: 'Programming' },
  { name: 'TypeScript', category: 'Programming' },
  { name: 'React', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'Python', category: 'Programming' },
  { name: 'AWS', category: 'Cloud' },
  { name: 'Docker', category: 'DevOps' },
  { name: 'SQL', category: 'Database' },
  { name: 'GraphQL', category: 'API' },
  { name: 'Agile', category: 'Methodology' },
  { name: 'Product Management', category: 'Management' },
  { name: 'UX Design', category: 'Design' },
  { name: 'Data Analysis', category: 'Analytics' },
  { name: 'Communication', category: 'Soft Skills' },
  { name: 'Leadership', category: 'Soft Skills' },
];

const GREEN_ENERGY_SKILLS: SkillSeed[] = [
  { name: 'Solar Engineering', category: 'Engineering' },
  { name: 'Wind Turbine Design', category: 'Engineering' },
  { name: 'Project Management', category: 'Management' },
  { name: 'AutoCAD', category: 'Design' },
  { name: 'Sustainability Reporting', category: 'Compliance' },
  { name: 'Data Analysis', category: 'Analytics' },
  { name: 'Python', category: 'Programming' },
  { name: 'Regulatory Compliance', category: 'Compliance' },
  { name: 'Financial Modeling', category: 'Finance' },
  { name: 'Marketing Strategy', category: 'Marketing' },
  { name: 'Communication', category: 'Soft Skills' },
  { name: 'Leadership', category: 'Soft Skills' },
  { name: 'HVAC Systems', category: 'Engineering' },
  { name: 'Electrical Engineering', category: 'Engineering' },
  { name: 'GIS', category: 'Technical' },
];

async function seedSkillsForOrg(
  prisma: PrismaClient,
  orgAdminEmail: string,
  skills: SkillSeed[],
) {
  const orgAdmin = await prisma.user.findUnique({
    where: { email: orgAdminEmail },
  });

  if (!orgAdmin?.organizationId) {
    console.warn(`  Skipping skills: org admin ${orgAdminEmail} not found or has no org.`);
    return;
  }

  await prisma.skill.createMany({
    data: skills.map((s) => ({
      name: s.name,
      category: s.category,
      organizationId: orgAdmin.organizationId!,
    })),
  });

  console.log(`  Created ${skills.length} skills for ${orgAdminEmail}`);
}

export async function seedSkills(prisma: PrismaClient) {
  console.log('Seeding skills...');
  await seedSkillsForOrg(prisma, 'admin@techcorp.example.com', TECHCORP_SKILLS);
  await seedSkillsForOrg(prisma, 'admin@greenenergy.example.com', GREEN_ENERGY_SKILLS);
  console.log('Skills seeded.');
}
