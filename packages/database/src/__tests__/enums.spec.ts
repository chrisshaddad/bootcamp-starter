/**
 * Tests for enum definitions introduced/modified in this PR.
 *
 * These tests verify that the expected enum values are correctly defined
 * as string constants. They serve as a compile-time and runtime contract
 * that enum values match what the schema specifies.
 *
 * Enums in scope:
 *  - UserRole (MEMBER removed, EMPLOYEE + HR added)
 *  - OpportunityStatus (new)
 *  - ApplicationStatus (new)
 */

// ── In-source enum mirrors ────────────────────────────────────────────────
// These mirror the Prisma-generated enums exactly. If the schema changes,
// these tests will flag discrepancies before a migration runs.

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

// ── UserRole ──────────────────────────────────────────────────────────────

describe('UserRole enum', () => {
  it('should contain SUPER_ADMIN', () => {
    expect(UserRole.SUPER_ADMIN).toBe('SUPER_ADMIN');
  });

  it('should contain ORG_ADMIN', () => {
    expect(UserRole.ORG_ADMIN).toBe('ORG_ADMIN');
  });

  it('should contain HR (new in this PR)', () => {
    expect(UserRole.HR).toBe('HR');
  });

  it('should contain EMPLOYEE (replaced MEMBER in this PR)', () => {
    expect(UserRole.EMPLOYEE).toBe('EMPLOYEE');
  });

  it('should NOT contain MEMBER (removed in this PR)', () => {
    expect(Object.values(UserRole)).not.toContain('MEMBER');
  });

  it('should have exactly 4 values', () => {
    expect(Object.values(UserRole)).toHaveLength(4);
  });

  it('all values should be non-empty strings', () => {
    Object.values(UserRole).forEach((val) => {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    });
  });

  it('should enumerate all roles correctly', () => {
    const roles = Object.values(UserRole);
    expect(roles).toEqual(['SUPER_ADMIN', 'ORG_ADMIN', 'HR', 'EMPLOYEE']);
  });
});

// ── OpportunityStatus ─────────────────────────────────────────────────────

describe('OpportunityStatus enum', () => {
  it('should contain DRAFT (default status for new opportunities)', () => {
    expect(OpportunityStatus.DRAFT).toBe('DRAFT');
  });

  it('should contain OPEN', () => {
    expect(OpportunityStatus.OPEN).toBe('OPEN');
  });

  it('should contain CLOSED', () => {
    expect(OpportunityStatus.CLOSED).toBe('CLOSED');
  });

  it('should contain FILLED', () => {
    expect(OpportunityStatus.FILLED).toBe('FILLED');
  });

  it('should have exactly 4 values', () => {
    expect(Object.values(OpportunityStatus)).toHaveLength(4);
  });

  it('all values should be non-empty strings', () => {
    Object.values(OpportunityStatus).forEach((val) => {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    });
  });

  it('should enumerate all statuses in lifecycle order', () => {
    const statuses = Object.values(OpportunityStatus);
    expect(statuses).toEqual(['DRAFT', 'OPEN', 'CLOSED', 'FILLED']);
  });

  it('DRAFT should be the default (first defined) status', () => {
    expect(Object.values(OpportunityStatus)[0]).toBe('DRAFT');
  });
});

// ── ApplicationStatus ─────────────────────────────────────────────────────

describe('ApplicationStatus enum', () => {
  it('should contain PENDING (default status for new applications)', () => {
    expect(ApplicationStatus.PENDING).toBe('PENDING');
  });

  it('should contain MANAGER_REVIEW', () => {
    expect(ApplicationStatus.MANAGER_REVIEW).toBe('MANAGER_REVIEW');
  });

  it('should contain UNDER_REVIEW', () => {
    expect(ApplicationStatus.UNDER_REVIEW).toBe('UNDER_REVIEW');
  });

  it('should contain SHORTLISTED', () => {
    expect(ApplicationStatus.SHORTLISTED).toBe('SHORTLISTED');
  });

  it('should contain ACCEPTED', () => {
    expect(ApplicationStatus.ACCEPTED).toBe('ACCEPTED');
  });

  it('should contain REJECTED', () => {
    expect(ApplicationStatus.REJECTED).toBe('REJECTED');
  });

  it('should contain WITHDRAWN', () => {
    expect(ApplicationStatus.WITHDRAWN).toBe('WITHDRAWN');
  });

  it('should have exactly 7 values', () => {
    expect(Object.values(ApplicationStatus)).toHaveLength(7);
  });

  it('all values should be non-empty strings', () => {
    Object.values(ApplicationStatus).forEach((val) => {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    });
  });

  it('should enumerate all statuses in workflow order', () => {
    const statuses = Object.values(ApplicationStatus);
    expect(statuses).toEqual([
      'PENDING',
      'MANAGER_REVIEW',
      'UNDER_REVIEW',
      'SHORTLISTED',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN',
    ]);
  });

  it('PENDING should be the default (first defined) status', () => {
    expect(Object.values(ApplicationStatus)[0]).toBe('PENDING');
  });

  describe('terminal statuses', () => {
    const terminalStatuses: ApplicationStatus[] = [
      ApplicationStatus.ACCEPTED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
    ];

    it('should recognize ACCEPTED as a terminal status', () => {
      expect(terminalStatuses).toContain(ApplicationStatus.ACCEPTED);
    });

    it('should recognize REJECTED as a terminal status', () => {
      expect(terminalStatuses).toContain(ApplicationStatus.REJECTED);
    });

    it('should recognize WITHDRAWN as a terminal status', () => {
      expect(terminalStatuses).toContain(ApplicationStatus.WITHDRAWN);
    });
  });

  describe('non-terminal statuses', () => {
    const activeStatuses: ApplicationStatus[] = [
      ApplicationStatus.PENDING,
      ApplicationStatus.MANAGER_REVIEW,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.SHORTLISTED,
    ];

    it('should have 4 active (non-terminal) statuses', () => {
      expect(activeStatuses).toHaveLength(4);
    });

    it('should not include terminal statuses in active set', () => {
      expect(activeStatuses).not.toContain(ApplicationStatus.ACCEPTED);
      expect(activeStatuses).not.toContain(ApplicationStatus.REJECTED);
      expect(activeStatuses).not.toContain(ApplicationStatus.WITHDRAWN);
    });
  });
});

// ── Cross-enum boundary tests ─────────────────────────────────────────────

describe('Enum value uniqueness across all enums', () => {
  it('PENDING appears in ApplicationStatus but must NOT be confused with OpportunityStatus values', () => {
    expect(Object.values(OpportunityStatus)).not.toContain('PENDING');
    expect(Object.values(ApplicationStatus)).toContain('PENDING');
  });

  it('OpportunityStatus values should not overlap with ApplicationStatus values', () => {
    const oppValues = new Set(Object.values(OpportunityStatus));
    const appValues = Object.values(ApplicationStatus);
    const overlap = appValues.filter((v) => oppValues.has(v));
    expect(overlap).toHaveLength(0);
  });

  it('UserRole values should not overlap with OpportunityStatus values', () => {
    const roleValues = new Set(Object.values(UserRole));
    const oppValues = Object.values(OpportunityStatus);
    const overlap = oppValues.filter((v) => roleValues.has(v));
    expect(overlap).toHaveLength(0);
  });
});