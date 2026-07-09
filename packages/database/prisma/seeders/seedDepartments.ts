import { PrismaClient } from '../../src/generated/prisma/client';

interface DepartmentSeed {
  name: string;
  description: string;
  orgAdminEmail: string; // to look up the org
}

const DEPARTMENTS: DepartmentSeed[] = [
  // TechCorp Solutions
  {
    name: 'Engineering',
    description:
      'Software development, infrastructure, and platform engineering.',
    orgAdminEmail: 'admin@techcorp.example.com',
  },
  {
    name: 'Product',
    description: 'Product management, strategy, and roadmap planning.',
    orgAdminEmail: 'admin@techcorp.example.com',
  },
  {
    name: 'Design',
    description: 'UX/UI design, user research, and design systems.',
    orgAdminEmail: 'admin@techcorp.example.com',
  },
  {
    name: 'Sales',
    description: 'Enterprise sales, account management, and partnerships.',
    orgAdminEmail: 'admin@techcorp.example.com',
  },
  // Green Energy Partners
  {
    name: 'R&D',
    description: 'Research and development of renewable energy technologies.',
    orgAdminEmail: 'admin@greenenergy.example.com',
  },
  {
    name: 'Operations',
    description: 'Project execution, site management, and logistics.',
    orgAdminEmail: 'admin@greenenergy.example.com',
  },
  {
    name: 'Marketing',
    description: 'Brand strategy, communications, and market analysis.',
    orgAdminEmail: 'admin@greenenergy.example.com',
  },
  {
    name: 'Finance',
    description: 'Financial planning, budgeting, and compliance reporting.',
    orgAdminEmail: 'admin@greenenergy.example.com',
  },
];

export async function seedDepartments(prisma: PrismaClient) {
  console.log('Seeding departments...');

  for (const dept of DEPARTMENTS) {
    const orgAdmin = await prisma.user.findUnique({
      where: { email: dept.orgAdminEmail },
    });

    if (!orgAdmin?.organizationId) {
      console.warn(
        `  Skipping ${dept.name}: org admin ${dept.orgAdminEmail} not found or has no org.`,
      );
      continue;
    }

    await prisma.department.create({
      data: {
        name: dept.name,
        description: dept.description,
        organizationId: orgAdmin.organizationId,
      },
    });

    console.log(`  Created department: ${dept.name} (${dept.orgAdminEmail})`);
  }

  console.log('Departments seeded.');
}
