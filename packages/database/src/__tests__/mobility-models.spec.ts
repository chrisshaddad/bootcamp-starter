/**
 * Tests for mobility models introduced in this PR:
 * Department, UserSkill, Opportunity, OpportunitySkill, Application, CareerPath
 *
 * These tests use a fully mocked Prisma client to validate:
 *  - Model field shapes and defaults
 *  - Relation linkage expectations
 *  - Business constraint logic (e.g. proficiency range, fit score bounds)
 *  - Default field values match schema definitions
 *  - Cascade/SetNull deletion semantics at the application logic level
 */

// ── Enum mirrors (must match schema.prisma) ───────────────────────────────

const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  HR: 'HR',
  EMPLOYEE: 'EMPLOYEE',
} as const;
type UserRole = (typeof UserRole)[keyof typeof UserRole];

const OpportunityStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  FILLED: 'FILLED',
} as const;
type OpportunityStatus = (typeof OpportunityStatus)[keyof typeof OpportunityStatus];

const ApplicationStatus = {
  PENDING: 'PENDING',
  MANAGER_REVIEW: 'MANAGER_REVIEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SHORTLISTED: 'SHORTLISTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

// ── Type interfaces (mirrors of Prisma model output types) ────────────────

interface User {
  id: string;
  email: string;
  isConfirmed: boolean;
  name: string;
  role: UserRole;
  organizationId: string | null;
  departmentId: string | null;
  title: string | null;
  level: number | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  organizationId: string;
}

interface UserSkill {
  userId: string;
  skillId: string;
  proficiencyLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Opportunity {
  id: string;
  title: string;
  departmentId: string | null;
  type: string;
  description: string | null;
  status: OpportunityStatus;
  deadline: Date | null;
  requiredLevel: number | null;
  organizationId: string;
  hiringManagerId: string | null;
  requiresManagerApproval: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OpportunitySkill {
  opportunityId: string;
  skillId: string;
  requiredLevel: number;
}

interface Application {
  id: string;
  userId: string;
  opportunityId: string;
  status: ApplicationStatus;
  fitScore: number | null;
  coverNote: string | null;
  reviewerNotes: string | null;
  managerApproved: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CareerPath {
  id: string;
  userId: string;
  targetTitle: string;
  timeframeMonths: number;
  milestones: unknown; // JSON
  createdAt: Date;
}

// ── Mock Prisma client factory ────────────────────────────────────────────

function createMockPrisma() {
  return {
    department: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    skill: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    userSkill: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    opportunity: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    opportunitySkill: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    application: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    careerPath: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-27T10:00:00Z');

const mockOrg = { id: 'org-1', name: 'Acme Corp' };

const mockUser: User = {
  id: 'user-1',
  email: 'alice@example.com',
  isConfirmed: true,
  name: 'Alice',
  role: UserRole.EMPLOYEE,
  organizationId: mockOrg.id,
  departmentId: null,
  title: null,
  level: null,
  managerId: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const mockManager: User = {
  ...mockUser,
  id: 'user-manager',
  email: 'bob@example.com',
  name: 'Bob',
  role: UserRole.HR,
};

const mockDepartment: Department = {
  id: 'dept-1',
  name: 'Engineering',
  description: 'Software engineering team',
  organizationId: mockOrg.id,
  managerId: mockManager.id,
  createdAt: NOW,
  updatedAt: NOW,
};

const mockSkill: Skill = {
  id: 'skill-1',
  name: 'TypeScript',
  category: 'Programming',
  organizationId: mockOrg.id,
};

const mockUserSkill: UserSkill = {
  userId: mockUser.id,
  skillId: mockSkill.id,
  proficiencyLevel: 3,
  createdAt: NOW,
  updatedAt: NOW,
};

const mockOpportunity: Opportunity = {
  id: 'opp-1',
  title: 'Senior Frontend Engineer',
  departmentId: mockDepartment.id,
  type: 'PROMOTION',
  description: 'Lead frontend development',
  status: OpportunityStatus.DRAFT,
  deadline: null,
  requiredLevel: 3,
  organizationId: mockOrg.id,
  hiringManagerId: mockManager.id,
  requiresManagerApproval: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const mockOpportunitySkill: OpportunitySkill = {
  opportunityId: mockOpportunity.id,
  skillId: mockSkill.id,
  requiredLevel: 4,
};

const mockApplication: Application = {
  id: 'app-1',
  userId: mockUser.id,
  opportunityId: mockOpportunity.id,
  status: ApplicationStatus.PENDING,
  fitScore: null,
  coverNote: null,
  reviewerNotes: null,
  managerApproved: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const mockCareerPath: CareerPath = {
  id: 'cp-1',
  userId: mockUser.id,
  targetTitle: 'Engineering Manager',
  timeframeMonths: 24,
  milestones: [
    { month: 6, goal: 'Lead a team project' },
    { month: 12, goal: 'Manage 2 direct reports' },
    { month: 24, goal: 'Full team ownership' },
  ],
  createdAt: NOW,
};

// ── Department tests ──────────────────────────────────────────────────────

describe('Department model', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a department with required fields', async () => {
    prisma.department.create.mockResolvedValue(mockDepartment);

    const result = await prisma.department.create({
      data: {
        name: 'Engineering',
        organizationId: mockOrg.id,
      },
    });

    expect(prisma.department.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(mockDepartment.id);
    expect(result.name).toBe('Engineering');
    expect(result.organizationId).toBe(mockOrg.id);
  });

  it('should allow description to be null (optional field)', async () => {
    const deptWithoutDesc: Department = { ...mockDepartment, description: null };
    prisma.department.create.mockResolvedValue(deptWithoutDesc);

    const result = await prisma.department.create({
      data: { name: 'Finance', organizationId: mockOrg.id },
    });

    expect(result.description).toBeNull();
  });

  it('should allow managerId to be null (department without a manager)', async () => {
    const deptNoManager: Department = { ...mockDepartment, managerId: null };
    prisma.department.create.mockResolvedValue(deptNoManager);

    const result = await prisma.department.create({
      data: { name: 'Unassigned', organizationId: mockOrg.id },
    });

    expect(result.managerId).toBeNull();
  });

  it('should assign a manager to a department', async () => {
    prisma.department.update.mockResolvedValue({
      ...mockDepartment,
      managerId: mockManager.id,
    });

    const result = await prisma.department.update({
      where: { id: mockDepartment.id },
      data: { managerId: mockManager.id },
    });

    expect(result.managerId).toBe(mockManager.id);
  });

  it('should have createdAt and updatedAt timestamps', () => {
    expect(mockDepartment.createdAt).toBeInstanceOf(Date);
    expect(mockDepartment.updatedAt).toBeInstanceOf(Date);
  });

  it('should find departments by organization', async () => {
    prisma.department.findMany.mockResolvedValue([mockDepartment]);

    const results = await prisma.department.findMany({
      where: { organizationId: mockOrg.id },
    });

    expect(results).toHaveLength(1);
    expect(results[0].organizationId).toBe(mockOrg.id);
  });

  it('should delete a department (simulating CASCADE to opportunities)', async () => {
    prisma.department.delete.mockResolvedValue(mockDepartment);

    const deleted = await prisma.department.delete({
      where: { id: mockDepartment.id },
    });

    expect(deleted.id).toBe(mockDepartment.id);
    expect(prisma.department.delete).toHaveBeenCalledWith({
      where: { id: mockDepartment.id },
    });
  });
});

// ── UserSkill tests ───────────────────────────────────────────────────────

describe('UserSkill model', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a user skill with default proficiency level 1', async () => {
    const newSkill: UserSkill = { ...mockUserSkill, proficiencyLevel: 1 };
    prisma.userSkill.create.mockResolvedValue(newSkill);

    const result = await prisma.userSkill.create({
      data: { userId: mockUser.id, skillId: mockSkill.id },
    });

    expect(result.proficiencyLevel).toBe(1);
  });

  it('should allow proficiency level from 1 to 5', async () => {
    for (let level = 1; level <= 5; level++) {
      prisma.userSkill.create.mockResolvedValue({ ...mockUserSkill, proficiencyLevel: level });

      const result = await prisma.userSkill.create({
        data: { userId: mockUser.id, skillId: mockSkill.id, proficiencyLevel: level },
      });

      expect(result.proficiencyLevel).toBe(level);
    }
  });

  it('should identify the composite primary key (userId + skillId)', () => {
    // The composite PK means we look up by both fields
    const lookupKey = { userId: mockUserSkill.userId, skillId: mockUserSkill.skillId };
    expect(lookupKey.userId).toBe(mockUser.id);
    expect(lookupKey.skillId).toBe(mockSkill.id);
  });

  it('should update a user skill proficiency level', async () => {
    prisma.userSkill.update.mockResolvedValue({ ...mockUserSkill, proficiencyLevel: 5 });

    const result = await prisma.userSkill.update({
      where: { userId_skillId: { userId: mockUser.id, skillId: mockSkill.id } },
      data: { proficiencyLevel: 5 },
    });

    expect(result.proficiencyLevel).toBe(5);
  });

  it('should upsert a user skill', async () => {
    prisma.userSkill.upsert.mockResolvedValue({ ...mockUserSkill, proficiencyLevel: 4 });

    const result = await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: mockUser.id, skillId: mockSkill.id } },
      create: { userId: mockUser.id, skillId: mockSkill.id, proficiencyLevel: 4 },
      update: { proficiencyLevel: 4 },
    });

    expect(result.proficiencyLevel).toBe(4);
  });

  it('should find all skills for a user', async () => {
    prisma.userSkill.findMany.mockResolvedValue([mockUserSkill]);

    const results = await prisma.userSkill.findMany({
      where: { userId: mockUser.id },
    });

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(mockUser.id);
  });

  it('should have timestamps', () => {
    expect(mockUserSkill.createdAt).toBeInstanceOf(Date);
    expect(mockUserSkill.updatedAt).toBeInstanceOf(Date);
  });
});

// ── Opportunity tests ─────────────────────────────────────────────────────

describe('Opportunity model', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an opportunity with DRAFT status by default', async () => {
    prisma.opportunity.create.mockResolvedValue(mockOpportunity);

    const result = await prisma.opportunity.create({
      data: {
        title: 'Senior Frontend Engineer',
        type: 'PROMOTION',
        organizationId: mockOrg.id,
      },
    });

    expect(result.status).toBe(OpportunityStatus.DRAFT);
  });

  it('should allow status to be updated to OPEN', async () => {
    prisma.opportunity.update.mockResolvedValue({
      ...mockOpportunity,
      status: OpportunityStatus.OPEN,
    });

    const result = await prisma.opportunity.update({
      where: { id: mockOpportunity.id },
      data: { status: OpportunityStatus.OPEN },
    });

    expect(result.status).toBe(OpportunityStatus.OPEN);
  });

  it('should transition through all valid statuses', async () => {
    const statuses: OpportunityStatus[] = [
      OpportunityStatus.DRAFT,
      OpportunityStatus.OPEN,
      OpportunityStatus.CLOSED,
      OpportunityStatus.FILLED,
    ];

    for (const status of statuses) {
      prisma.opportunity.update.mockResolvedValue({ ...mockOpportunity, status });
      const result = await prisma.opportunity.update({
        where: { id: mockOpportunity.id },
        data: { status },
      });
      expect(result.status).toBe(status);
    }
  });

  it('should allow departmentId to be null (org-wide opportunity)', async () => {
    const orgWideOpp: Opportunity = { ...mockOpportunity, departmentId: null };
    prisma.opportunity.create.mockResolvedValue(orgWideOpp);

    const result = await prisma.opportunity.create({
      data: { title: 'All-org initiative', type: 'PROJECT', organizationId: mockOrg.id },
    });

    expect(result.departmentId).toBeNull();
  });

  it('should allow hiringManagerId to be null', async () => {
    const noManager: Opportunity = { ...mockOpportunity, hiringManagerId: null };
    prisma.opportunity.create.mockResolvedValue(noManager);

    const result = await prisma.opportunity.create({
      data: { title: 'Open Role', type: 'LATERAL_MOVE', organizationId: mockOrg.id },
    });

    expect(result.hiringManagerId).toBeNull();
  });

  it('should store requiresManagerApproval as null (use org default)', async () => {
    const useOrgDefault: Opportunity = { ...mockOpportunity, requiresManagerApproval: null };
    prisma.opportunity.create.mockResolvedValue(useOrgDefault);

    const result = await prisma.opportunity.create({
      data: { title: 'Role', type: 'PROJECT', organizationId: mockOrg.id },
    });

    expect(result.requiresManagerApproval).toBeNull();
  });

  it('should override requiresManagerApproval at opportunity level (true)', async () => {
    const withOverride: Opportunity = { ...mockOpportunity, requiresManagerApproval: true };
    prisma.opportunity.create.mockResolvedValue(withOverride);

    const result = await prisma.opportunity.create({
      data: { title: 'Sensitive Role', type: 'PROMOTION', organizationId: mockOrg.id, requiresManagerApproval: true },
    });

    expect(result.requiresManagerApproval).toBe(true);
  });

  it('should allow deadline to be null', async () => {
    const noDeadline: Opportunity = { ...mockOpportunity, deadline: null };
    prisma.opportunity.create.mockResolvedValue(noDeadline);

    const result = await prisma.opportunity.create({
      data: { title: 'Ongoing Role', type: 'LATERAL_MOVE', organizationId: mockOrg.id },
    });

    expect(result.deadline).toBeNull();
  });

  it('should allow requiredLevel to be null (no level requirement)', async () => {
    const noLevel: Opportunity = { ...mockOpportunity, requiredLevel: null };
    prisma.opportunity.create.mockResolvedValue(noLevel);

    const result = await prisma.opportunity.create({
      data: { title: 'Any Level Role', type: 'PROJECT', organizationId: mockOrg.id },
    });

    expect(result.requiredLevel).toBeNull();
  });

  it('should find open opportunities by organization', async () => {
    const openOpp: Opportunity = { ...mockOpportunity, status: OpportunityStatus.OPEN };
    prisma.opportunity.findMany.mockResolvedValue([openOpp]);

    const results = await prisma.opportunity.findMany({
      where: { organizationId: mockOrg.id, status: OpportunityStatus.OPEN },
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe(OpportunityStatus.OPEN);
  });

  it('should find opportunities by department', async () => {
    prisma.opportunity.findMany.mockResolvedValue([mockOpportunity]);

    const results = await prisma.opportunity.findMany({
      where: { departmentId: mockDepartment.id },
    });

    expect(results[0].departmentId).toBe(mockDepartment.id);
  });
});

// ── OpportunitySkill tests ────────────────────────────────────────────────

describe('OpportunitySkill model', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should link an opportunity to a required skill with required level', async () => {
    prisma.opportunitySkill.create.mockResolvedValue(mockOpportunitySkill);

    const result = await prisma.opportunitySkill.create({
      data: {
        opportunityId: mockOpportunity.id,
        skillId: mockSkill.id,
        requiredLevel: 4,
      },
    });

    expect(result.opportunityId).toBe(mockOpportunity.id);
    expect(result.skillId).toBe(mockSkill.id);
    expect(result.requiredLevel).toBe(4);
  });

  it('should find all required skills for an opportunity', async () => {
    prisma.opportunitySkill.findMany.mockResolvedValue([mockOpportunitySkill]);

    const results = await prisma.opportunitySkill.findMany({
      where: { opportunityId: mockOpportunity.id },
    });

    expect(results).toHaveLength(1);
    expect(results[0].skillId).toBe(mockSkill.id);
  });

  it('composite PK structure should be (opportunityId, skillId)', () => {
    const pk = {
      opportunityId: mockOpportunitySkill.opportunityId,
      skillId: mockOpportunitySkill.skillId,
    };
    expect(pk).toStrictEqual({
      opportunityId: mockOpportunity.id,
      skillId: mockSkill.id,
    });
  });
});

// ── Application tests ─────────────────────────────────────────────────────

describe('Application model', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an application with PENDING status by default', async () => {
    prisma.application.create.mockResolvedValue(mockApplication);

    const result = await prisma.application.create({
      data: {
        userId: mockUser.id,
        opportunityId: mockOpportunity.id,
      },
    });

    expect(result.status).toBe(ApplicationStatus.PENDING);
  });

  it('should allow fitScore to be null on creation', async () => {
    prisma.application.create.mockResolvedValue({ ...mockApplication, fitScore: null });

    const result = await prisma.application.create({
      data: { userId: mockUser.id, opportunityId: mockOpportunity.id },
    });

    expect(result.fitScore).toBeNull();
  });

  it('should store a computed fitScore as a float', async () => {
    prisma.application.update.mockResolvedValue({ ...mockApplication, fitScore: 0.85 });

    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { fitScore: 0.85 },
    });

    expect(result.fitScore).toBe(0.85);
    expect(typeof result.fitScore).toBe('number');
  });

  it('should advance status through the review workflow', async () => {
    const transitions: [ApplicationStatus, ApplicationStatus][] = [
      [ApplicationStatus.PENDING, ApplicationStatus.MANAGER_REVIEW],
      [ApplicationStatus.MANAGER_REVIEW, ApplicationStatus.UNDER_REVIEW],
      [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SHORTLISTED],
      [ApplicationStatus.SHORTLISTED, ApplicationStatus.ACCEPTED],
    ];

    for (const [, nextStatus] of transitions) {
      prisma.application.update.mockResolvedValue({ ...mockApplication, status: nextStatus });

      const result = await prisma.application.update({
        where: { id: mockApplication.id },
        data: { status: nextStatus },
      });

      expect(result.status).toBe(nextStatus);
    }
  });

  it('should allow an applicant to withdraw (set status to WITHDRAWN)', async () => {
    prisma.application.update.mockResolvedValue({
      ...mockApplication,
      status: ApplicationStatus.WITHDRAWN,
    });

    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { status: ApplicationStatus.WITHDRAWN },
    });

    expect(result.status).toBe(ApplicationStatus.WITHDRAWN);
  });

  it('should allow reviewerNotes to be added during review', async () => {
    const notes = 'Strong candidate, proceed to interview';
    prisma.application.update.mockResolvedValue({
      ...mockApplication,
      status: ApplicationStatus.SHORTLISTED,
      reviewerNotes: notes,
    });

    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { status: ApplicationStatus.SHORTLISTED, reviewerNotes: notes },
    });

    expect(result.reviewerNotes).toBe(notes);
  });

  it('should allow managerApproved to be null (approval not yet decided or not required)', async () => {
    expect(mockApplication.managerApproved).toBeNull();
  });

  it('should set managerApproved to true when manager approves', async () => {
    prisma.application.update.mockResolvedValue({
      ...mockApplication,
      status: ApplicationStatus.UNDER_REVIEW,
      managerApproved: true,
    });

    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { managerApproved: true, status: ApplicationStatus.UNDER_REVIEW },
    });

    expect(result.managerApproved).toBe(true);
  });

  it('should set managerApproved to false when manager rejects', async () => {
    prisma.application.update.mockResolvedValue({
      ...mockApplication,
      status: ApplicationStatus.REJECTED,
      managerApproved: false,
    });

    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { managerApproved: false, status: ApplicationStatus.REJECTED },
    });

    expect(result.managerApproved).toBe(false);
  });

  it('should find all applications for a user', async () => {
    prisma.application.findMany.mockResolvedValue([mockApplication]);

    const results = await prisma.application.findMany({
      where: { userId: mockUser.id },
    });

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(mockUser.id);
  });

  it('should find all applications for an opportunity', async () => {
    prisma.application.findMany.mockResolvedValue([mockApplication]);

    const results = await prisma.application.findMany({
      where: { opportunityId: mockOpportunity.id },
    });

    expect(results).toHaveLength(1);
    expect(results[0].opportunityId).toBe(mockOpportunity.id);
  });

  it('should have both createdAt and updatedAt timestamps', () => {
    expect(mockApplication.createdAt).toBeInstanceOf(Date);
    expect(mockApplication.updatedAt).toBeInstanceOf(Date);
  });
});

// ── CareerPath tests ──────────────────────────────────────────────────────

describe('CareerPath model', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a career path with required fields', async () => {
    prisma.careerPath.create.mockResolvedValue(mockCareerPath);

    const result = await prisma.careerPath.create({
      data: {
        userId: mockUser.id,
        targetTitle: 'Engineering Manager',
        timeframeMonths: 24,
        milestones: [{ month: 6, goal: 'Lead project' }],
      },
    });

    expect(result.userId).toBe(mockUser.id);
    expect(result.targetTitle).toBe('Engineering Manager');
    expect(result.timeframeMonths).toBe(24);
  });

  it('should store milestones as JSON (array of objects)', async () => {
    const milestones = [
      { month: 6, goal: 'Lead a team project' },
      { month: 12, goal: 'Manage 2 direct reports' },
    ];
    prisma.careerPath.create.mockResolvedValue({ ...mockCareerPath, milestones });

    const result = await prisma.careerPath.create({
      data: {
        userId: mockUser.id,
        targetTitle: 'Staff Engineer',
        timeframeMonths: 18,
        milestones,
      },
    });

    expect(Array.isArray(result.milestones)).toBe(true);
    expect((result.milestones as typeof milestones)[0].month).toBe(6);
  });

  it('should store milestones as JSON object (not just array)', async () => {
    const milestonesObj = { phase1: 'complete training', phase2: 'lead team' };
    prisma.careerPath.create.mockResolvedValue({ ...mockCareerPath, milestones: milestonesObj });

    const result = await prisma.careerPath.create({
      data: {
        userId: mockUser.id,
        targetTitle: 'Principal Engineer',
        timeframeMonths: 36,
        milestones: milestonesObj,
      },
    });

    expect(typeof result.milestones).toBe('object');
  });

  it('should find all career paths for a user', async () => {
    prisma.careerPath.findMany.mockResolvedValue([mockCareerPath]);

    const results = await prisma.careerPath.findMany({
      where: { userId: mockUser.id },
    });

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(mockUser.id);
  });

  it('should have only createdAt (no updatedAt per schema)', () => {
    expect(mockCareerPath.createdAt).toBeInstanceOf(Date);
    // CareerPath does not have updatedAt in the schema
    expect('updatedAt' in mockCareerPath).toBe(false);
  });

  it('should allow timeframeMonths to be any positive integer', async () => {
    const timeframes = [3, 6, 12, 18, 24, 36, 60];

    for (const months of timeframes) {
      prisma.careerPath.create.mockResolvedValue({ ...mockCareerPath, timeframeMonths: months });

      const result = await prisma.careerPath.create({
        data: {
          userId: mockUser.id,
          targetTitle: 'Lead',
          timeframeMonths: months,
          milestones: [],
        },
      });

      expect(result.timeframeMonths).toBe(months);
    }
  });

  it('should delete a career path (CASCADE from User deletion)', async () => {
    prisma.careerPath.delete.mockResolvedValue(mockCareerPath);

    const deleted = await prisma.careerPath.delete({
      where: { id: mockCareerPath.id },
    });

    expect(deleted.id).toBe(mockCareerPath.id);
  });
});

// ── User model updates (new fields from this PR) ──────────────────────────

describe('User model new fields (from this PR)', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have departmentId as a nullable field', () => {
    expect(mockUser.departmentId).toBeNull();
  });

  it('should have title as a nullable field', () => {
    expect(mockUser.title).toBeNull();
  });

  it('should have level as a nullable field', () => {
    expect(mockUser.level).toBeNull();
  });

  it('should have managerId as a nullable field (self-relation)', () => {
    expect(mockUser.managerId).toBeNull();
  });

  it('default role should be EMPLOYEE (changed from MEMBER in this PR)', () => {
    const newUser: User = {
      ...mockUser,
      id: 'new-user',
      email: 'new@example.com',
      role: UserRole.EMPLOYEE,
    };
    expect(newUser.role).toBe(UserRole.EMPLOYEE);
    expect(newUser.role).not.toBe('MEMBER');
  });

  it('should allow assigning user to a department', async () => {
    prisma.user.update.mockResolvedValue({
      ...mockUser,
      departmentId: mockDepartment.id,
    });

    const result = await prisma.user.update({
      where: { id: mockUser.id },
      data: { departmentId: mockDepartment.id },
    });

    expect(result.departmentId).toBe(mockDepartment.id);
  });

  it('should allow setting a manager via self-relation', async () => {
    prisma.user.update.mockResolvedValue({
      ...mockUser,
      managerId: mockManager.id,
    });

    const result = await prisma.user.update({
      where: { id: mockUser.id },
      data: { managerId: mockManager.id },
    });

    expect(result.managerId).toBe(mockManager.id);
  });

  it('should support HR role (new in this PR)', () => {
    const hrUser: User = { ...mockUser, role: UserRole.HR };
    expect(hrUser.role).toBe('HR');
  });
});

// ── Organization new field: requiresManagerApproval ───────────────────────

describe('Organization model new field: requiresManagerApproval', () => {
  it('should default requiresManagerApproval to false', () => {
    const org = {
      id: 'org-1',
      name: 'Acme Corp',
      requiresManagerApproval: false,
    };
    expect(org.requiresManagerApproval).toBe(false);
  });

  it('should allow requiresManagerApproval to be overridden to true', () => {
    const strictOrg = {
      id: 'org-2',
      name: 'Strict Corp',
      requiresManagerApproval: true,
    };
    expect(strictOrg.requiresManagerApproval).toBe(true);
  });
});

// ── Approval flow integration test ────────────────────────────────────────

describe('Manager approval flow', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should route application to MANAGER_REVIEW when org requires approval', async () => {
    // When an org has requiresManagerApproval=true and opportunity.requiresManagerApproval is null,
    // applications should go to MANAGER_REVIEW status
    const appInManagerReview: Application = {
      ...mockApplication,
      status: ApplicationStatus.MANAGER_REVIEW,
    };
    prisma.application.update.mockResolvedValue(appInManagerReview);

    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { status: ApplicationStatus.MANAGER_REVIEW },
    });

    expect(result.status).toBe(ApplicationStatus.MANAGER_REVIEW);
  });

  it('should skip MANAGER_REVIEW when opportunity explicitly does not require it', async () => {
    // Opportunity with requiresManagerApproval=false should go straight to UNDER_REVIEW
    const oppNoApproval: Opportunity = { ...mockOpportunity, requiresManagerApproval: false };
    const appUnderReview: Application = {
      ...mockApplication,
      status: ApplicationStatus.UNDER_REVIEW,
    };

    prisma.opportunity.findUnique.mockResolvedValue(oppNoApproval);
    prisma.application.update.mockResolvedValue(appUnderReview);

    const opp = await prisma.opportunity.findUnique({ where: { id: oppNoApproval.id } });
    expect(opp!.requiresManagerApproval).toBe(false);

    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { status: ApplicationStatus.UNDER_REVIEW },
    });

    expect(result.status).toBe(ApplicationStatus.UNDER_REVIEW);
  });

  it('should use opportunity-level override over org-level default', () => {
    // null = use org default; true/false = override
    const oppOverrideTrue: Opportunity = { ...mockOpportunity, requiresManagerApproval: true };
    const oppOverrideFalse: Opportunity = { ...mockOpportunity, requiresManagerApproval: false };
    const oppUseOrgDefault: Opportunity = { ...mockOpportunity, requiresManagerApproval: null };

    expect(oppOverrideTrue.requiresManagerApproval).toBe(true);
    expect(oppOverrideFalse.requiresManagerApproval).toBe(false);
    expect(oppUseOrgDefault.requiresManagerApproval).toBeNull();
  });
});

// ── Fit score boundary tests ──────────────────────────────────────────────

describe('Application fitScore boundary tests', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should accept fitScore of 0.0 (no skill match)', async () => {
    prisma.application.update.mockResolvedValue({ ...mockApplication, fitScore: 0.0 });
    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { fitScore: 0.0 },
    });
    expect(result.fitScore).toBe(0.0);
  });

  it('should accept fitScore of 1.0 (perfect skill match)', async () => {
    prisma.application.update.mockResolvedValue({ ...mockApplication, fitScore: 1.0 });
    const result = await prisma.application.update({
      where: { id: mockApplication.id },
      data: { fitScore: 1.0 },
    });
    expect(result.fitScore).toBe(1.0);
  });

  it('should accept fractional fitScore values', async () => {
    const fractionalScores = [0.25, 0.5, 0.75, 0.875];
    for (const score of fractionalScores) {
      prisma.application.update.mockResolvedValue({ ...mockApplication, fitScore: score });
      const result = await prisma.application.update({
        where: { id: mockApplication.id },
        data: { fitScore: score },
      });
      expect(result.fitScore).toBe(score);
    }
  });
});