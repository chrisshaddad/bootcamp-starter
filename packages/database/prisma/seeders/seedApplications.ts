import { PrismaClient } from '../../src/generated/prisma/client';

interface ApplicationSeed {
  employeeEmail: string;
  opportunityTitle: string;
  orgAdminEmail: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';
  coverNote: string | null;
  reviewerNotes: string | null;
}

const APPLICATIONS: ApplicationSeed[] = [
  // TechCorp applications
  {
    employeeEmail: 'alex.rivera@techcorp.example.com',
    opportunityTitle: 'Senior Full-Stack Engineer',
    orgAdminEmail: 'admin@techcorp.example.com',
    status: 'UNDER_REVIEW',
    coverNote:
      'I have 4 years of experience with React and Node.js and am ready to take on a senior role. I have led multiple feature launches on the platform team.',
    reviewerNotes: null,
  },
  {
    employeeEmail: 'priya.sharma@techcorp.example.com',
    opportunityTitle: 'Cloud Migration Project',
    orgAdminEmail: 'admin@techcorp.example.com',
    status: 'ACCEPTED',
    coverNote:
      'My AWS and Python experience make me a strong fit. I have worked on data pipeline migrations before.',
    reviewerNotes: 'Strong backend skills, good cultural fit for the project team.',
  },
  {
    employeeEmail: 'marcus.johnson@techcorp.example.com',
    opportunityTitle: 'Product Team Rotation',
    orgAdminEmail: 'admin@techcorp.example.com',
    status: 'PENDING',
    coverNote:
      'I want to explore product management as a career path. I believe my customer-facing experience in engineering can help me understand user needs better.',
    reviewerNotes: null,
  },
  {
    employeeEmail: 'tom.bradley@techcorp.example.com',
    opportunityTitle: 'Cloud Migration Project',
    orgAdminEmail: 'admin@techcorp.example.com',
    status: 'SHORTLISTED',
    coverNote:
      'As the DevOps lead, I have deep knowledge of our infrastructure and can ensure a smooth migration.',
    reviewerNotes: 'Top candidate. Expert-level AWS and Docker knowledge.',
  },
  {
    employeeEmail: 'kevin.nguyen@techcorp.example.com',
    opportunityTitle: 'API Platform Engineer',
    orgAdminEmail: 'admin@techcorp.example.com',
    status: 'REJECTED',
    coverNote: 'Looking to transition from PM to a more technical role.',
    reviewerNotes:
      'Appreciate the interest but the technical bar is too high for current skill level. Recommend building GraphQL experience first.',
  },
  // Green Energy applications
  {
    employeeEmail: 'yuki.tanaka@greenenergy.example.com',
    opportunityTitle: 'Senior Solar Engineer',
    orgAdminEmail: 'admin@greenenergy.example.com',
    status: 'UNDER_REVIEW',
    coverNote:
      'I have been designing PV systems for 3 years and am ready to take on larger commercial projects.',
    reviewerNotes: null,
  },
  {
    employeeEmail: 'omar.farouk@greenenergy.example.com',
    opportunityTitle: 'Wind Farm Site Assessment Project',
    orgAdminEmail: 'admin@greenenergy.example.com',
    status: 'ACCEPTED',
    coverNote:
      'This is exactly what I specialize in. My GIS and wind analysis skills are directly applicable.',
    reviewerNotes: 'Perfect match for this project. Deep expertise in all required areas.',
  },
  {
    employeeEmail: 'mei.zhou@greenenergy.example.com',
    opportunityTitle: 'Operations Team Rotation',
    orgAdminEmail: 'admin@greenenergy.example.com',
    status: 'PENDING',
    coverNote:
      'As a junior engineer, I would love to gain field experience to complement my academic knowledge.',
    reviewerNotes: null,
  },
];

function calculateFitScore(
  employeeSkills: Map<string, number>,
  requiredSkills: { skillName: string; requiredLevel: number }[],
): number {
  if (requiredSkills.length === 0) return 50;

  let totalScore = 0;
  for (const req of requiredSkills) {
    const proficiency = employeeSkills.get(req.skillName) || 0;
    const ratio = Math.min(proficiency / req.requiredLevel, 1);
    totalScore += ratio;
  }

  return Math.round((totalScore / requiredSkills.length) * 100);
}

export async function seedApplications(prisma: PrismaClient) {
  console.log('Seeding applications...');

  for (const app of APPLICATIONS) {
    const employee = await prisma.user.findUnique({
      where: { email: app.employeeEmail },
      include: {
        userSkills: { include: { skill: true } },
      },
    });

    if (!employee) {
      console.warn(`  Skipping: employee ${app.employeeEmail} not found.`);
      continue;
    }

    // Find opportunity by title within the same org
    const orgAdmin = await prisma.user.findUnique({
      where: { email: app.orgAdminEmail },
    });

    if (!orgAdmin?.organizationId) continue;

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        title: app.opportunityTitle,
        organizationId: orgAdmin.organizationId,
      },
      include: {
        opportunitySkills: { include: { skill: true } },
      },
    });

    if (!opportunity) {
      console.warn(`  Skipping: opportunity "${app.opportunityTitle}" not found.`);
      continue;
    }

    // Calculate fit score
    const employeeSkillMap = new Map(
      employee.userSkills.map((us) => [us.skill.name, us.proficiencyLevel]),
    );
    const requiredSkills = opportunity.opportunitySkills.map((os) => ({
      skillName: os.skill.name,
      requiredLevel: os.requiredLevel,
    }));
    const fitScore = calculateFitScore(employeeSkillMap, requiredSkills);

    await prisma.application.create({
      data: {
        userId: employee.id,
        opportunityId: opportunity.id,
        status: app.status,
        fitScore,
        coverNote: app.coverNote,
        reviewerNotes: app.reviewerNotes,
      },
    });

    console.log(
      `  Created application: ${employee.name} → ${opportunity.title} (${app.status}, fit: ${fitScore})`,
    );
  }

  console.log('Applications seeded.');
}
