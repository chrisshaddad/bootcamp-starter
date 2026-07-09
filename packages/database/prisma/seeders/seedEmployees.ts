import { PrismaClient } from '../../src/generated/prisma/client';

interface EmployeeSeed {
  email: string;
  name: string;
  role: 'EMPLOYEE' | 'HR';
  title: string;
  level: number;
  departmentName: string;
  orgAdminEmail: string;
  isManager?: boolean; // will have subordinates assigned to them
  bio: string;
  city: string;
  state: string;
  country: string;
  skillAssignments: { skillName: string; proficiency: number }[];
}

const TECHCORP_EMPLOYEES: EmployeeSeed[] = [
  // Managers
  {
    email: 'lisa.wang@techcorp.example.com',
    name: 'Lisa Wang',
    role: 'EMPLOYEE',
    title: 'Engineering Manager',
    level: 5,
    departmentName: 'Engineering',
    orgAdminEmail: 'admin@techcorp.example.com',
    isManager: true,
    bio: 'Engineering leader with 10+ years building scalable distributed systems.',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    skillAssignments: [
      { skillName: 'TypeScript', proficiency: 5 },
      { skillName: 'Node.js', proficiency: 5 },
      { skillName: 'AWS', proficiency: 4 },
      { skillName: 'Leadership', proficiency: 5 },
      { skillName: 'Docker', proficiency: 4 },
    ],
  },
  {
    email: 'james.park@techcorp.example.com',
    name: 'James Park',
    role: 'EMPLOYEE',
    title: 'Product Lead',
    level: 5,
    departmentName: 'Product',
    orgAdminEmail: 'admin@techcorp.example.com',
    isManager: true,
    bio: 'Product strategist focused on enterprise SaaS platforms.',
    city: 'New York',
    state: 'NY',
    country: 'US',
    skillAssignments: [
      { skillName: 'Product Management', proficiency: 5 },
      { skillName: 'Agile', proficiency: 4 },
      { skillName: 'Data Analysis', proficiency: 3 },
      { skillName: 'Communication', proficiency: 5 },
      { skillName: 'Leadership', proficiency: 4 },
    ],
  },
  {
    email: 'hr@techcorp.example.com',
    name: 'Diana Torres',
    role: 'HR',
    title: 'HR Business Partner',
    level: 4,
    departmentName: 'Product',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Talent development specialist passionate about internal mobility.',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    skillAssignments: [
      { skillName: 'Communication', proficiency: 5 },
      { skillName: 'Leadership', proficiency: 4 },
      { skillName: 'Agile', proficiency: 3 },
    ],
  },
  // Individual contributors
  {
    email: 'alex.rivera@techcorp.example.com',
    name: 'Alex Rivera',
    role: 'EMPLOYEE',
    title: 'Senior Software Engineer',
    level: 4,
    departmentName: 'Engineering',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Full-stack developer specializing in React and Node.js microservices.',
    city: 'Seattle',
    state: 'WA',
    country: 'US',
    skillAssignments: [
      { skillName: 'JavaScript', proficiency: 5 },
      { skillName: 'TypeScript', proficiency: 4 },
      { skillName: 'React', proficiency: 5 },
      { skillName: 'Node.js', proficiency: 4 },
      { skillName: 'SQL', proficiency: 3 },
      { skillName: 'Docker', proficiency: 3 },
    ],
  },
  {
    email: 'priya.sharma@techcorp.example.com',
    name: 'Priya Sharma',
    role: 'EMPLOYEE',
    title: 'Software Engineer',
    level: 3,
    departmentName: 'Engineering',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Backend engineer working on API platform and data pipelines.',
    city: 'Chicago',
    state: 'IL',
    country: 'US',
    skillAssignments: [
      { skillName: 'Python', proficiency: 4 },
      { skillName: 'SQL', proficiency: 4 },
      { skillName: 'AWS', proficiency: 3 },
      { skillName: 'Docker', proficiency: 2 },
      { skillName: 'GraphQL', proficiency: 3 },
    ],
  },
  {
    email: 'marcus.johnson@techcorp.example.com',
    name: 'Marcus Johnson',
    role: 'EMPLOYEE',
    title: 'Junior Developer',
    level: 2,
    departmentName: 'Engineering',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Recent bootcamp grad eager to grow into a full-stack role.',
    city: 'Denver',
    state: 'CO',
    country: 'US',
    skillAssignments: [
      { skillName: 'JavaScript', proficiency: 3 },
      { skillName: 'React', proficiency: 2 },
      { skillName: 'SQL', proficiency: 2 },
      { skillName: 'Communication', proficiency: 3 },
    ],
  },
  {
    email: 'emily.chen@techcorp.example.com',
    name: 'Emily Chen',
    role: 'EMPLOYEE',
    title: 'UX Designer',
    level: 3,
    departmentName: 'Design',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Designing intuitive enterprise interfaces with a focus on accessibility.',
    city: 'Portland',
    state: 'OR',
    country: 'US',
    skillAssignments: [
      { skillName: 'UX Design', proficiency: 5 },
      { skillName: 'Communication', proficiency: 4 },
      { skillName: 'Agile', proficiency: 3 },
      { skillName: 'Data Analysis', proficiency: 2 },
    ],
  },
  {
    email: 'kevin.nguyen@techcorp.example.com',
    name: 'Kevin Nguyen',
    role: 'EMPLOYEE',
    title: 'Product Manager',
    level: 3,
    departmentName: 'Product',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Building products that solve real customer problems.',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    skillAssignments: [
      { skillName: 'Product Management', proficiency: 3 },
      { skillName: 'Agile', proficiency: 4 },
      { skillName: 'Data Analysis', proficiency: 3 },
      { skillName: 'Communication', proficiency: 4 },
    ],
  },
  {
    email: 'rachel.kim@techcorp.example.com',
    name: 'Rachel Kim',
    role: 'EMPLOYEE',
    title: 'Sales Engineer',
    level: 3,
    departmentName: 'Sales',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Technical sales professional bridging engineering and client success.',
    city: 'Boston',
    state: 'MA',
    country: 'US',
    skillAssignments: [
      { skillName: 'Communication', proficiency: 5 },
      { skillName: 'JavaScript', proficiency: 3 },
      { skillName: 'AWS', proficiency: 2 },
      { skillName: 'Product Management', proficiency: 2 },
    ],
  },
  {
    email: 'tom.bradley@techcorp.example.com',
    name: 'Tom Bradley',
    role: 'EMPLOYEE',
    title: 'DevOps Engineer',
    level: 4,
    departmentName: 'Engineering',
    orgAdminEmail: 'admin@techcorp.example.com',
    bio: 'Infrastructure and CI/CD specialist keeping the platform reliable.',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    skillAssignments: [
      { skillName: 'AWS', proficiency: 5 },
      { skillName: 'Docker', proficiency: 5 },
      { skillName: 'Python', proficiency: 3 },
      { skillName: 'SQL', proficiency: 3 },
      { skillName: 'Leadership', proficiency: 2 },
    ],
  },
];

const GREEN_ENERGY_EMPLOYEES: EmployeeSeed[] = [
  // Managers
  {
    email: 'fatima.hassan@greenenergy.example.com',
    name: 'Fatima Hassan',
    role: 'EMPLOYEE',
    title: 'R&D Director',
    level: 5,
    departmentName: 'R&D',
    orgAdminEmail: 'admin@greenenergy.example.com',
    isManager: true,
    bio: 'Leading renewable energy research with 15 years in solar and wind technology.',
    city: 'Houston',
    state: 'TX',
    country: 'US',
    skillAssignments: [
      { skillName: 'Solar Engineering', proficiency: 5 },
      { skillName: 'Leadership', proficiency: 5 },
      { skillName: 'Project Management', proficiency: 4 },
      { skillName: 'Data Analysis', proficiency: 3 },
      { skillName: 'Regulatory Compliance', proficiency: 4 },
    ],
  },
  {
    email: 'david.oconnor@greenenergy.example.com',
    name: "David O'Connor",
    role: 'EMPLOYEE',
    title: 'Operations Manager',
    level: 5,
    departmentName: 'Operations',
    orgAdminEmail: 'admin@greenenergy.example.com',
    isManager: true,
    bio: 'Operations leader with deep expertise in large-scale energy project delivery.',
    city: 'Phoenix',
    state: 'AZ',
    country: 'US',
    skillAssignments: [
      { skillName: 'Project Management', proficiency: 5 },
      { skillName: 'Leadership', proficiency: 5 },
      { skillName: 'Communication', proficiency: 4 },
      { skillName: 'Regulatory Compliance', proficiency: 3 },
    ],
  },
  {
    email: 'hr@greenenergy.example.com',
    name: 'Sandra Lopez',
    role: 'HR',
    title: 'People & Culture Lead',
    level: 4,
    departmentName: 'Operations',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Building a people-first culture in the clean energy sector.',
    city: 'Denver',
    state: 'CO',
    country: 'US',
    skillAssignments: [
      { skillName: 'Communication', proficiency: 5 },
      { skillName: 'Leadership', proficiency: 4 },
      { skillName: 'Project Management', proficiency: 3 },
    ],
  },
  // Individual contributors
  {
    email: 'yuki.tanaka@greenenergy.example.com',
    name: 'Yuki Tanaka',
    role: 'EMPLOYEE',
    title: 'Solar Systems Engineer',
    level: 4,
    departmentName: 'R&D',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Designing next-generation photovoltaic systems for commercial installations.',
    city: 'Los Angeles',
    state: 'CA',
    country: 'US',
    skillAssignments: [
      { skillName: 'Solar Engineering', proficiency: 5 },
      { skillName: 'AutoCAD', proficiency: 4 },
      { skillName: 'Electrical Engineering', proficiency: 4 },
      { skillName: 'Python', proficiency: 3 },
      { skillName: 'Data Analysis', proficiency: 3 },
    ],
  },
  {
    email: 'omar.farouk@greenenergy.example.com',
    name: 'Omar Farouk',
    role: 'EMPLOYEE',
    title: 'Wind Energy Analyst',
    level: 3,
    departmentName: 'R&D',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Analyzing wind patterns and optimizing turbine placement for maximum output.',
    city: 'Oklahoma City',
    state: 'OK',
    country: 'US',
    skillAssignments: [
      { skillName: 'Wind Turbine Design', proficiency: 4 },
      { skillName: 'Data Analysis', proficiency: 4 },
      { skillName: 'GIS', proficiency: 4 },
      { skillName: 'Python', proficiency: 3 },
    ],
  },
  {
    email: 'clara.martinez@greenenergy.example.com',
    name: 'Clara Martinez',
    role: 'EMPLOYEE',
    title: 'Project Coordinator',
    level: 2,
    departmentName: 'Operations',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Coordinating renewable energy installations across multiple sites.',
    city: 'San Diego',
    state: 'CA',
    country: 'US',
    skillAssignments: [
      { skillName: 'Project Management', proficiency: 2 },
      { skillName: 'Communication', proficiency: 4 },
      { skillName: 'Sustainability Reporting', proficiency: 2 },
    ],
  },
  {
    email: 'ben.thompson@greenenergy.example.com',
    name: 'Ben Thompson',
    role: 'EMPLOYEE',
    title: 'HVAC Specialist',
    level: 3,
    departmentName: 'Operations',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Integrating energy-efficient HVAC systems with solar installations.',
    city: 'Dallas',
    state: 'TX',
    country: 'US',
    skillAssignments: [
      { skillName: 'HVAC Systems', proficiency: 5 },
      { skillName: 'Electrical Engineering', proficiency: 3 },
      { skillName: 'AutoCAD', proficiency: 3 },
      { skillName: 'Regulatory Compliance', proficiency: 2 },
    ],
  },
  {
    email: 'nina.patel@greenenergy.example.com',
    name: 'Nina Patel',
    role: 'EMPLOYEE',
    title: 'Marketing Analyst',
    level: 3,
    departmentName: 'Marketing',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Driving brand awareness for clean energy solutions.',
    city: 'Miami',
    state: 'FL',
    country: 'US',
    skillAssignments: [
      { skillName: 'Marketing Strategy', proficiency: 4 },
      { skillName: 'Data Analysis', proficiency: 3 },
      { skillName: 'Communication', proficiency: 4 },
      { skillName: 'Sustainability Reporting', proficiency: 2 },
    ],
  },
  {
    email: 'carlos.ruiz@greenenergy.example.com',
    name: 'Carlos Ruiz',
    role: 'EMPLOYEE',
    title: 'Financial Analyst',
    level: 3,
    departmentName: 'Finance',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Modeling ROI for renewable energy investments and government incentives.',
    city: 'Chicago',
    state: 'IL',
    country: 'US',
    skillAssignments: [
      { skillName: 'Financial Modeling', proficiency: 5 },
      { skillName: 'Data Analysis', proficiency: 4 },
      { skillName: 'Regulatory Compliance', proficiency: 3 },
      { skillName: 'Communication', proficiency: 3 },
    ],
  },
  {
    email: 'mei.zhou@greenenergy.example.com',
    name: 'Mei Zhou',
    role: 'EMPLOYEE',
    title: 'Junior Engineer',
    level: 2,
    departmentName: 'R&D',
    orgAdminEmail: 'admin@greenenergy.example.com',
    bio: 'Recent graduate exploring a career in sustainable energy engineering.',
    city: 'Portland',
    state: 'OR',
    country: 'US',
    skillAssignments: [
      { skillName: 'Python', proficiency: 3 },
      { skillName: 'AutoCAD', proficiency: 2 },
      { skillName: 'Solar Engineering', proficiency: 2 },
      { skillName: 'Data Analysis', proficiency: 2 },
    ],
  },
];

async function seedEmployeesForOrg(
  prisma: PrismaClient,
  employees: EmployeeSeed[],
) {
  // Look up org from the first employee's orgAdminEmail
  const orgAdminEmail = employees[0]!.orgAdminEmail;
  const orgAdmin = await prisma.user.findUnique({
    where: { email: orgAdminEmail },
  });

  if (!orgAdmin?.organizationId) {
    console.warn(`  Skipping employees: org admin ${orgAdminEmail} not found.`);
    return;
  }

  const orgId = orgAdmin.organizationId;

  // Get departments for this org
  const departments = await prisma.department.findMany({
    where: { organizationId: orgId },
  });
  const deptMap = new Map(departments.map((d) => [d.name, d.id]));

  // Get skills for this org
  const skills = await prisma.skill.findMany({
    where: { organizationId: orgId },
  });
  const skillMap = new Map(skills.map((s) => [s.name, s.id]));

  // First pass: create managers
  const managers = employees.filter((e) => e.isManager);
  const managerIdMap = new Map<string, string>();

  for (const emp of managers) {
    const user = await prisma.user.create({
      data: {
        email: emp.email,
        name: emp.name,
        role: emp.role,
        title: emp.title,
        level: emp.level,
        isConfirmed: true,
        organizationId: orgId,
        departmentId: deptMap.get(emp.departmentName),
      },
    });
    managerIdMap.set(emp.departmentName, user.id);

    // Set as department manager
    const deptId = deptMap.get(emp.departmentName);
    if (deptId) {
      await prisma.department.update({
        where: { id: deptId },
        data: { managerId: user.id },
      });
    }

    // Create profile
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        bio: emp.bio,
        city: emp.city,
        state: emp.state,
        country: emp.country,
      },
    });

    // Create skill assignments
    for (const sa of emp.skillAssignments) {
      const skillId = skillMap.get(sa.skillName);
      if (skillId) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId,
            proficiencyLevel: sa.proficiency,
          },
        });
      }
    }

    console.log(`  Created manager: ${emp.name} (${emp.title})`);
  }

  // Second pass: create ICs and HR, assign to managers
  const nonManagers = employees.filter((e) => !e.isManager);

  for (const emp of nonManagers) {
    const managerId = managerIdMap.get(emp.departmentName);

    const user = await prisma.user.create({
      data: {
        email: emp.email,
        name: emp.name,
        role: emp.role,
        title: emp.title,
        level: emp.level,
        isConfirmed: true,
        organizationId: orgId,
        departmentId: deptMap.get(emp.departmentName),
        managerId: managerId || null,
      },
    });

    // Create profile
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        bio: emp.bio,
        city: emp.city,
        state: emp.state,
        country: emp.country,
      },
    });

    // Create skill assignments
    for (const sa of emp.skillAssignments) {
      const skillId = skillMap.get(sa.skillName);
      if (skillId) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId,
            proficiencyLevel: sa.proficiency,
          },
        });
      }
    }

    console.log(`  Created employee: ${emp.name} (${emp.title})`);
  }
}

export async function seedEmployees(prisma: PrismaClient) {
  console.log('Seeding employees...');
  await seedEmployeesForOrg(prisma, TECHCORP_EMPLOYEES);
  await seedEmployeesForOrg(prisma, GREEN_ENERGY_EMPLOYEES);
  console.log('Employees seeded.');
}
