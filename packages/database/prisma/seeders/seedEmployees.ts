import {
  PrismaClient,
  EmploymentType,
  WorkArrangement,
} from '../../src/generated/prisma/client';

const TECHCORP_ORG_NAME = 'TechCorp Solutions';

interface DepartmentSeed {
  name: string;
  description: string;
  managerEmail: string;
}

const DEPARTMENTS: DepartmentSeed[] = [
  {
    name: 'Engineering',
    description: 'Builds and operates the core product.',
    managerEmail: 'priya.nair@techcorp.example.com',
  },
  {
    name: 'Data Science',
    description: 'Owns ML models and the data platform.',
    managerEmail: 'dana.osei@techcorp.example.com',
  },
  {
    name: 'Product',
    description: 'Product strategy and roadmap.',
    managerEmail: 'morgan.diaz@techcorp.example.com',
  },
  {
    name: 'Platform',
    description: 'Infrastructure, reliability, and developer tooling.',
    managerEmail: 'taylor.brooks@techcorp.example.com',
  },
  {
    name: 'Design',
    description: 'Product design and design systems.',
    managerEmail: 'sam.patel@techcorp.example.com',
  },
];

interface EmployeeProfileSeed {
  phoneNumber: string;
  street1: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
}

interface EmployeeSeed {
  email: string;
  name: string;
  title: string;
  level: number;
  department: string;
  managerEmail?: string; // reports to (undefined = department head)
  skills: { name: string; proficiencyLevel: number }[];
  profile: EmployeeProfileSeed;
}

// Employees are seeded in order; managers must appear before their reports.
const EMPLOYEES: EmployeeSeed[] = [
  {
    email: 'priya.nair@techcorp.example.com',
    name: 'Priya Nair',
    title: 'Engineering Manager',
    level: 5,
    department: 'Engineering',
    skills: [
      { name: 'People Management', proficiencyLevel: 5 },
      { name: 'System Design', proficiencyLevel: 4 },
      { name: 'JavaScript', proficiencyLevel: 3 },
      { name: 'Stakeholder Communication', proficiencyLevel: 4 },
    ],
    profile: {
      phoneNumber: '+1 415 555 0132',
      street1: '450 Folsom Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'United States',
      employmentType: 'FULL_TIME',
      workArrangement: 'HYBRID',
    },
  },
  {
    email: 'dana.osei@techcorp.example.com',
    name: 'Dana Osei',
    title: 'Data Science Manager',
    level: 5,
    department: 'Data Science',
    skills: [
      { name: 'Machine Learning', proficiencyLevel: 5 },
      { name: 'People Management', proficiencyLevel: 4 },
      { name: 'Python', proficiencyLevel: 4 },
      { name: 'Data Modeling', proficiencyLevel: 4 },
    ],
    profile: {
      phoneNumber: '+961 1 555 234',
      street1: '12 Hamra Street',
      city: 'Beirut',
      postalCode: '1103',
      country: 'Lebanon',
      employmentType: 'FULL_TIME',
      workArrangement: 'REMOTE',
    },
  },
  {
    email: 'morgan.diaz@techcorp.example.com',
    name: 'Morgan Diaz',
    title: 'Senior Product Manager',
    level: 4,
    department: 'Product',
    skills: [
      { name: 'Product Strategy', proficiencyLevel: 5 },
      { name: 'Roadmapping', proficiencyLevel: 4 },
      { name: 'User Research', proficiencyLevel: 3 },
      { name: 'Stakeholder Communication', proficiencyLevel: 4 },
    ],
    profile: {
      phoneNumber: '+1 212 555 0199',
      street1: '88 Broadway',
      city: 'New York',
      state: 'NY',
      postalCode: '10004',
      country: 'United States',
      employmentType: 'FULL_TIME',
      workArrangement: 'HYBRID',
    },
  },
  {
    email: 'taylor.brooks@techcorp.example.com',
    name: 'Taylor Brooks',
    title: 'Platform Lead',
    level: 4,
    department: 'Platform',
    skills: [
      { name: 'Kubernetes', proficiencyLevel: 5 },
      { name: 'AWS', proficiencyLevel: 4 },
      { name: 'CI/CD', proficiencyLevel: 4 },
      { name: 'System Design', proficiencyLevel: 3 },
    ],
    profile: {
      phoneNumber: '+1 512 555 0143',
      street1: '600 Congress Avenue',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'United States',
      employmentType: 'FULL_TIME',
      workArrangement: 'REMOTE',
    },
  },
  {
    email: 'sam.patel@techcorp.example.com',
    name: 'Sam Patel',
    title: 'Design Lead',
    level: 4,
    department: 'Design',
    skills: [
      { name: 'UI Design', proficiencyLevel: 5 },
      { name: 'Design Systems', proficiencyLevel: 4 },
      { name: 'User Research', proficiencyLevel: 3 },
    ],
    profile: {
      phoneNumber: '+961 3 555 876',
      street1: '45 Bliss Street',
      city: 'Beirut',
      postalCode: '1107',
      country: 'Lebanon',
      employmentType: 'FULL_TIME',
      workArrangement: 'HYBRID',
    },
  },
  {
    email: 'alex.rivera@techcorp.example.com',
    name: 'Alex Rivera',
    title: 'Senior Software Engineer',
    level: 4,
    department: 'Engineering',
    managerEmail: 'priya.nair@techcorp.example.com',
    skills: [
      { name: 'Node.js', proficiencyLevel: 4 },
      { name: 'TypeScript', proficiencyLevel: 4 },
      { name: 'SQL', proficiencyLevel: 3 },
      { name: 'System Design', proficiencyLevel: 3 },
      { name: 'AWS', proficiencyLevel: 3 },
    ],
    profile: {
      phoneNumber: '+1 415 555 0177',
      street1: '201 Mission Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'United States',
      employmentType: 'FULL_TIME',
      workArrangement: 'ONSITE',
    },
  },
  {
    email: 'riley.chen@techcorp.example.com',
    name: 'Riley Chen',
    title: 'Frontend Engineer',
    level: 3,
    department: 'Engineering',
    managerEmail: 'priya.nair@techcorp.example.com',
    skills: [
      { name: 'React', proficiencyLevel: 4 },
      { name: 'TypeScript', proficiencyLevel: 3 },
      { name: 'JavaScript', proficiencyLevel: 4 },
      { name: 'UI Design', proficiencyLevel: 2 },
    ],
    profile: {
      phoneNumber: '+961 76 555 321',
      street1: '9 Gouraud Street',
      city: 'Beirut',
      postalCode: '2020',
      country: 'Lebanon',
      employmentType: 'PART_TIME',
      workArrangement: 'REMOTE',
    },
  },
  {
    email: 'jordan.lee@techcorp.example.com',
    name: 'Jordan Lee',
    title: 'Software Engineer',
    level: 2,
    department: 'Engineering',
    managerEmail: 'priya.nair@techcorp.example.com',
    skills: [
      { name: 'JavaScript', proficiencyLevel: 3 },
      { name: 'Node.js', proficiencyLevel: 2 },
      { name: 'SQL', proficiencyLevel: 2 },
    ],
    profile: {
      phoneNumber: '+1 415 555 0120',
      street1: '201 Mission Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'United States',
      employmentType: 'FULL_TIME',
      workArrangement: 'HYBRID',
    },
  },
  {
    email: 'jamie.torres@techcorp.example.com',
    name: 'Jamie Torres',
    title: 'Junior Software Engineer',
    level: 1,
    department: 'Engineering',
    managerEmail: 'priya.nair@techcorp.example.com',
    skills: [
      { name: 'JavaScript', proficiencyLevel: 2 },
      { name: 'React', proficiencyLevel: 1 },
    ],
    profile: {
      phoneNumber: '+1 312 555 0110',
      street1: '150 N Michigan Avenue',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'United States',
      employmentType: 'INTERN',
      workArrangement: 'ONSITE',
    },
  },
  {
    email: 'casey.kim@techcorp.example.com',
    name: 'Casey Kim',
    title: 'Data Scientist',
    level: 3,
    department: 'Data Science',
    managerEmail: 'dana.osei@techcorp.example.com',
    skills: [
      { name: 'Python', proficiencyLevel: 4 },
      { name: 'Machine Learning', proficiencyLevel: 3 },
      { name: 'SQL', proficiencyLevel: 3 },
      { name: 'Data Modeling', proficiencyLevel: 3 },
    ],
    profile: {
      phoneNumber: '+961 70 555 654',
      street1: '22 Sassine Square',
      city: 'Beirut',
      postalCode: '1200',
      country: 'Lebanon',
      employmentType: 'CONTRACT',
      workArrangement: 'REMOTE',
    },
  },
];

export async function seedEmployees(prisma: PrismaClient) {
  console.log('Seeding TechCorp departments and employees...');

  const org = await prisma.organization.findFirst({
    where: { name: TECHCORP_ORG_NAME },
  });

  if (!org) {
    console.warn(
      `  Warning: ${TECHCORP_ORG_NAME} not found. Skipping employees.`,
    );
    return;
  }

  const departmentIdByName = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.create({
      data: {
        name: dept.name,
        description: dept.description,
        organizationId: org.id,
      },
    });
    departmentIdByName.set(dept.name, created.id);
  }

  const userIdByEmail = new Map<string, string>();
  for (const employee of EMPLOYEES) {
    const managerId = employee.managerEmail
      ? userIdByEmail.get(employee.managerEmail)
      : undefined;

    const created = await prisma.user.create({
      data: {
        email: employee.email,
        name: employee.name,
        title: employee.title,
        level: employee.level,
        role: 'EMPLOYEE',
        isConfirmed: true,
        organizationId: org.id,
        departmentId: departmentIdByName.get(employee.department),
        managerId,
      },
    });
    userIdByEmail.set(employee.email, created.id);

    await prisma.userProfile.create({
      data: {
        userId: created.id,
        ...employee.profile,
      },
    });

    await prisma.userSkill.createMany({
      data: await Promise.all(
        employee.skills.map(async (skill) => {
          const skillRecord = await prisma.skill.findFirstOrThrow({
            where: { name: skill.name, organizationId: org.id },
          });
          return {
            userId: created.id,
            skillId: skillRecord.id,
            proficiencyLevel: skill.proficiencyLevel,
          };
        }),
      ),
    });
  }

  // Assign department heads now that the manager users exist
  for (const dept of DEPARTMENTS) {
    const managerId = userIdByEmail.get(dept.managerEmail);
    await prisma.department.update({
      where: { id: departmentIdByName.get(dept.name) },
      data: { managerId },
    });
  }

  console.log(
    `Departments seeded: ${DEPARTMENTS.length}, employees seeded: ${EMPLOYEES.length} for ${org.name}`,
  );
}
