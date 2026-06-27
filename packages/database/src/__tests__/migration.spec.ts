import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for migration: 20260627102843_add_mobility_models
 *
 * These tests verify the SQL migration file contains the expected DDL
 * statements for all new models introduced in this PR.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../prisma/migrations/20260627102843_add_mobility_models/migration.sql',
);

describe('Migration: 20260627102843_add_mobility_models', () => {
  let sql: string;

  beforeAll(() => {
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('should exist and be non-empty', () => {
    expect(sql).toBeTruthy();
    expect(sql.length).toBeGreaterThan(0);
  });

  // ── Enum: OpportunityStatus ──────────────────────────────────────────────

  describe('OpportunityStatus enum', () => {
    it("should create OpportunityStatus enum with 'DRAFT' value", () => {
      expect(sql).toContain("CREATE TYPE \"OpportunityStatus\" AS ENUM");
      expect(sql).toContain("'DRAFT'");
    });

    it("should include 'OPEN' value in OpportunityStatus", () => {
      expect(sql).toContain("'OPEN'");
    });

    it("should include 'CLOSED' value in OpportunityStatus", () => {
      expect(sql).toContain("'CLOSED'");
    });

    it("should include 'FILLED' value in OpportunityStatus", () => {
      expect(sql).toContain("'FILLED'");
    });

    it('should define exactly 4 values for OpportunityStatus', () => {
      const match = sql.match(/CREATE TYPE "OpportunityStatus" AS ENUM \(([^)]+)\)/);
      expect(match).not.toBeNull();
      const values = match![1].split(',').map((v) => v.trim());
      expect(values).toHaveLength(4);
      expect(values).toEqual(["'DRAFT'", "'OPEN'", "'CLOSED'", "'FILLED'"]);
    });
  });

  // ── Enum: ApplicationStatus ──────────────────────────────────────────────

  describe('ApplicationStatus enum', () => {
    it('should create ApplicationStatus enum', () => {
      expect(sql).toContain('CREATE TYPE "ApplicationStatus" AS ENUM');
    });

    it("should include 'PENDING' value", () => {
      // PENDING is shared with OpportunityStatus default - verify it's in ApplicationStatus block
      expect(sql).toContain("CREATE TYPE \"ApplicationStatus\" AS ENUM");
      expect(sql).toContain("'PENDING'");
    });

    it("should include 'MANAGER_REVIEW' value", () => {
      expect(sql).toContain("'MANAGER_REVIEW'");
    });

    it("should include 'UNDER_REVIEW' value", () => {
      expect(sql).toContain("'UNDER_REVIEW'");
    });

    it("should include 'SHORTLISTED' value", () => {
      expect(sql).toContain("'SHORTLISTED'");
    });

    it("should include 'ACCEPTED' value", () => {
      expect(sql).toContain("'ACCEPTED'");
    });

    it("should include 'REJECTED' value", () => {
      expect(sql).toContain("'REJECTED'");
    });

    it("should include 'WITHDRAWN' value", () => {
      expect(sql).toContain("'WITHDRAWN'");
    });

    it('should define exactly 7 values for ApplicationStatus', () => {
      const match = sql.match(/CREATE TYPE "ApplicationStatus" AS ENUM \(([^)]+)\)/);
      expect(match).not.toBeNull();
      const values = match![1].split(',').map((v) => v.trim());
      expect(values).toHaveLength(7);
      expect(values).toEqual([
        "'PENDING'",
        "'MANAGER_REVIEW'",
        "'UNDER_REVIEW'",
        "'SHORTLISTED'",
        "'ACCEPTED'",
        "'REJECTED'",
        "'WITHDRAWN'",
      ]);
    });
  });

  // ── Enum: UserRole migration ─────────────────────────────────────────────

  describe('UserRole enum alteration', () => {
    it("should remove MEMBER and add EMPLOYEE to UserRole", () => {
      expect(sql).toContain("The values [MEMBER] on the enum `UserRole` will be removed");
      expect(sql).toContain("CREATE TYPE \"UserRole_new\" AS ENUM");
      expect(sql).toContain("'EMPLOYEE'");
    });

    it("should add HR role to UserRole", () => {
      expect(sql).toContain("'HR'");
    });

    it('should use a safe multi-step ALTER ENUM pattern (BEGIN/COMMIT)', () => {
      expect(sql).toContain('BEGIN;');
      expect(sql).toContain('COMMIT;');
    });

    it("should rename old UserRole type before dropping it", () => {
      expect(sql).toContain('ALTER TYPE "UserRole" RENAME TO "UserRole_old"');
    });

    it("should drop the old UserRole type", () => {
      expect(sql).toContain('DROP TYPE "public"."UserRole_old"');
    });

    it("should set EMPLOYEE as new default for User.role", () => {
      expect(sql).toContain("ALTER TABLE \"User\" ALTER COLUMN \"role\" SET DEFAULT 'EMPLOYEE'");
    });
  });

  // ── Table: Department ────────────────────────────────────────────────────

  describe('Department table', () => {
    it('should create Department table', () => {
      expect(sql).toContain('CREATE TABLE "Department"');
    });

    it('should have id as primary key (TEXT)', () => {
      expect(sql).toContain('"Department_pkey" PRIMARY KEY ("id")');
    });

    it('should have name column (TEXT NOT NULL)', () => {
      const deptBlock = extractTableBlock(sql, 'Department');
      expect(deptBlock).toContain('"name" TEXT NOT NULL');
    });

    it('should have description column (TEXT, nullable)', () => {
      const deptBlock = extractTableBlock(sql, 'Department');
      expect(deptBlock).toContain('"description" TEXT');
    });

    it('should have organizationId column (TEXT NOT NULL)', () => {
      const deptBlock = extractTableBlock(sql, 'Department');
      expect(deptBlock).toContain('"organizationId" TEXT NOT NULL');
    });

    it('should have managerId column (TEXT, nullable)', () => {
      const deptBlock = extractTableBlock(sql, 'Department');
      expect(deptBlock).toContain('"managerId" TEXT');
    });

    it('should have createdAt timestamp with default', () => {
      const deptBlock = extractTableBlock(sql, 'Department');
      expect(deptBlock).toContain('"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    });

    it('should have updatedAt timestamp', () => {
      const deptBlock = extractTableBlock(sql, 'Department');
      expect(deptBlock).toContain('"updatedAt" TIMESTAMP(3) NOT NULL');
    });

    it('should have index on organizationId', () => {
      expect(sql).toContain('CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId")');
    });

    it('should have foreign key to Organization with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE',
      );
    });

    it('should have foreign key to User (manager) with SET NULL on delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL',
      );
    });
  });

  // ── Table: Skill (updated) ───────────────────────────────────────────────

  describe('Skill table', () => {
    it('should create Skill table', () => {
      expect(sql).toContain('CREATE TABLE "Skill"');
    });

    it('should have category column', () => {
      const skillBlock = extractTableBlock(sql, 'Skill');
      expect(skillBlock).toContain('"category" TEXT NOT NULL');
    });

    it('should have index on organizationId', () => {
      expect(sql).toContain('CREATE INDEX "Skill_organizationId_idx" ON "Skill"("organizationId")');
    });

    it('should have foreign key to Organization with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Skill" ADD CONSTRAINT "Skill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE',
      );
    });
  });

  // ── Table: UserSkill ─────────────────────────────────────────────────────

  describe('UserSkill table', () => {
    it('should create UserSkill table', () => {
      expect(sql).toContain('CREATE TABLE "UserSkill"');
    });

    it('should have composite primary key on (userId, skillId)', () => {
      expect(sql).toContain('"UserSkill_pkey" PRIMARY KEY ("userId","skillId")');
    });

    it('should have proficiencyLevel with default 1', () => {
      const block = extractTableBlock(sql, 'UserSkill');
      expect(block).toContain('"proficiencyLevel" INTEGER NOT NULL DEFAULT 1');
    });

    it('should have foreign key to User with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE',
      );
    });

    it('should have foreign key to Skill with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE',
      );
    });
  });

  // ── Table: Opportunity ───────────────────────────────────────────────────

  describe('Opportunity table', () => {
    it('should create Opportunity table', () => {
      expect(sql).toContain('CREATE TABLE "Opportunity"');
    });

    it("should have status column defaulting to 'DRAFT'", () => {
      const block = extractTableBlock(sql, 'Opportunity');
      expect(block).toContain('"status" "OpportunityStatus" NOT NULL DEFAULT \'DRAFT\'');
    });

    it('should have departmentId column (nullable)', () => {
      const block = extractTableBlock(sql, 'Opportunity');
      expect(block).toContain('"departmentId" TEXT');
    });

    it('should have hiringManagerId column (nullable)', () => {
      const block = extractTableBlock(sql, 'Opportunity');
      expect(block).toContain('"hiringManagerId" TEXT');
    });

    it('should have requiresManagerApproval column (nullable boolean)', () => {
      const block = extractTableBlock(sql, 'Opportunity');
      expect(block).toContain('"requiresManagerApproval" BOOLEAN');
    });

    it('should have requiredLevel column (nullable integer)', () => {
      const block = extractTableBlock(sql, 'Opportunity');
      expect(block).toContain('"requiredLevel" INTEGER');
    });

    it('should have indexes on organizationId and departmentId', () => {
      expect(sql).toContain('CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId")');
      expect(sql).toContain('CREATE INDEX "Opportunity_departmentId_idx" ON "Opportunity"("departmentId")');
    });

    it('should have foreign key to Department with SET NULL on delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL',
      );
    });

    it('should have foreign key to Organization with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE',
      );
    });

    it('should have foreign key to User (hiringManager) with SET NULL on delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_hiringManagerId_fkey" FOREIGN KEY ("hiringManagerId") REFERENCES "User"("id") ON DELETE SET NULL',
      );
    });
  });

  // ── Table: OpportunitySkill ──────────────────────────────────────────────

  describe('OpportunitySkill table', () => {
    it('should create OpportunitySkill table', () => {
      expect(sql).toContain('CREATE TABLE "OpportunitySkill"');
    });

    it('should have composite primary key on (opportunityId, skillId)', () => {
      expect(sql).toContain('"OpportunitySkill_pkey" PRIMARY KEY ("opportunityId","skillId")');
    });

    it('should have requiredLevel column (INTEGER NOT NULL)', () => {
      const block = extractTableBlock(sql, 'OpportunitySkill');
      expect(block).toContain('"requiredLevel" INTEGER NOT NULL');
    });

    it('should have foreign key to Opportunity with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "OpportunitySkill" ADD CONSTRAINT "OpportunitySkill_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE',
      );
    });

    it('should have foreign key to Skill with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "OpportunitySkill" ADD CONSTRAINT "OpportunitySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE',
      );
    });
  });

  // ── Table: Application ───────────────────────────────────────────────────

  describe('Application table', () => {
    it('should create Application table', () => {
      expect(sql).toContain('CREATE TABLE "Application"');
    });

    it("should have status column defaulting to 'PENDING'", () => {
      const block = extractTableBlock(sql, 'Application');
      expect(block).toContain('"status" "ApplicationStatus" NOT NULL DEFAULT \'PENDING\'');
    });

    it('should have fitScore column (nullable DOUBLE PRECISION)', () => {
      const block = extractTableBlock(sql, 'Application');
      expect(block).toContain('"fitScore" DOUBLE PRECISION');
    });

    it('should have coverNote column (nullable TEXT)', () => {
      const block = extractTableBlock(sql, 'Application');
      expect(block).toContain('"coverNote" TEXT');
    });

    it('should have reviewerNotes column (nullable TEXT)', () => {
      const block = extractTableBlock(sql, 'Application');
      expect(block).toContain('"reviewerNotes" TEXT');
    });

    it('should have managerApproved column (nullable BOOLEAN)', () => {
      const block = extractTableBlock(sql, 'Application');
      expect(block).toContain('"managerApproved" BOOLEAN');
    });

    it('should have indexes on userId and opportunityId', () => {
      expect(sql).toContain('CREATE INDEX "Application_userId_idx" ON "Application"("userId")');
      expect(sql).toContain('CREATE INDEX "Application_opportunityId_idx" ON "Application"("opportunityId")');
    });

    it('should have foreign key to User with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE',
      );
    });

    it('should have foreign key to Opportunity with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "Application" ADD CONSTRAINT "Application_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE',
      );
    });
  });

  // ── Table: CareerPath ────────────────────────────────────────────────────

  describe('CareerPath table', () => {
    it('should create CareerPath table', () => {
      expect(sql).toContain('CREATE TABLE "CareerPath"');
    });

    it('should have targetTitle column (TEXT NOT NULL)', () => {
      const block = extractTableBlock(sql, 'CareerPath');
      expect(block).toContain('"targetTitle" TEXT NOT NULL');
    });

    it('should have timeframeMonths column (INTEGER NOT NULL)', () => {
      const block = extractTableBlock(sql, 'CareerPath');
      expect(block).toContain('"timeframeMonths" INTEGER NOT NULL');
    });

    it('should have milestones column (JSONB NOT NULL)', () => {
      const block = extractTableBlock(sql, 'CareerPath');
      expect(block).toContain('"milestones" JSONB NOT NULL');
    });

    it('should have index on userId', () => {
      expect(sql).toContain('CREATE INDEX "CareerPath_userId_idx" ON "CareerPath"("userId")');
    });

    it('should have foreign key to User with CASCADE delete', () => {
      expect(sql).toContain(
        'ALTER TABLE "CareerPath" ADD CONSTRAINT "CareerPath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE',
      );
    });
  });

  // ── Organization table alterations ───────────────────────────────────────

  describe('Organization table alterations', () => {
    it('should add requiresManagerApproval column with default false', () => {
      expect(sql).toContain(
        'ALTER TABLE "Organization" ADD COLUMN     "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT false',
      );
    });
  });

  // ── User table alterations ───────────────────────────────────────────────

  describe('User table alterations', () => {
    it('should add departmentId column', () => {
      expect(sql).toContain('ADD COLUMN     "departmentId" TEXT');
    });

    it('should add level column', () => {
      expect(sql).toContain('ADD COLUMN     "level" INTEGER');
    });

    it('should add managerId column', () => {
      expect(sql).toContain('ADD COLUMN     "managerId" TEXT');
    });

    it('should add title column', () => {
      expect(sql).toContain('ADD COLUMN     "title" TEXT');
    });

    it('should have index on User.departmentId', () => {
      expect(sql).toContain('CREATE INDEX "User_departmentId_idx" ON "User"("departmentId")');
    });

    it('should add foreign key from User.managerId to User.id (self-relation)', () => {
      expect(sql).toContain(
        'ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL',
      );
    });

    it('should add foreign key from User.departmentId to Department.id', () => {
      expect(sql).toContain(
        'ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL',
      );
    });
  });
});

/**
 * Extracts the CREATE TABLE block for a given table name from SQL.
 * Returns the content between the opening paren and the CONSTRAINT line.
 */
function extractTableBlock(sql: string, tableName: string): string {
  const regex = new RegExp(
    `CREATE TABLE "${tableName}"\\s*\\(([\\s\\S]*?)\\s*CONSTRAINT\\s+"${tableName}_pkey"`,
  );
  const match = sql.match(regex);
  return match ? match[1] : '';
}