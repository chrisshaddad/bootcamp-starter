import { describe, it, expect } from 'vitest';
import { pickPrimaryRole, normalizeRole, isRole, ROLES } from '@/auth/roles';

describe('pickPrimaryRole', () => {
  it('returns null for empty array', () => {
    expect(pickPrimaryRole([])).toBeNull();
  });

  it('returns null for unrecognised roles', () => {
    expect(pickPrimaryRole(['unknown', 'garbage'])).toBeNull();
  });

  it('picks org_admin when present (highest precedence)', () => {
    expect(pickPrimaryRole(['tenant', 'org_admin', 'finance'])).toBe(
      'org_admin',
    );
  });

  it('picks supervisor when org_admin absent', () => {
    expect(pickPrimaryRole(['tenant', 'supervisor'])).toBe('supervisor');
  });

  it('picks finance when only finance and below', () => {
    expect(pickPrimaryRole(['maintenance', 'finance'])).toBe('finance');
  });

  it('picks maintenance over tenant', () => {
    expect(pickPrimaryRole(['tenant', 'maintenance'])).toBe('maintenance');
  });

  it('picks tenant as lowest role', () => {
    expect(pickPrimaryRole(['tenant'])).toBe('tenant');
  });

  it('handles Keycloak-style capitalised role names via aliases', () => {
    expect(pickPrimaryRole(['OrgAdmin'])).toBe('org_admin');
    expect(pickPrimaryRole(['ORG_ADMIN'])).toBe('org_admin');
    expect(pickPrimaryRole(['Supervisor'])).toBe('supervisor');
  });

  it('ignores irrelevant realm roles mixed in with valid ones', () => {
    expect(
      pickPrimaryRole(['offline_access', 'uma_authorization', 'finance']),
    ).toBe('finance');
  });
});

describe('normalizeRole', () => {
  it('returns null for null/undefined', () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole('')).toBeNull();
  });

  it('normalizes all aliases', () => {
    expect(normalizeRole('org_admin')).toBe('org_admin');
    expect(normalizeRole('OrgAdmin')).toBe('org_admin');
    expect(normalizeRole('TENANT')).toBe('tenant');
    expect(normalizeRole('Finance')).toBe('finance');
  });
});

describe('isRole', () => {
  it('returns true for valid roles', () => {
    for (const role of ROLES) {
      expect(isRole(role)).toBe(true);
    }
  });

  it('returns false for unknown strings', () => {
    expect(isRole('admin')).toBe(false);
    expect(isRole('citizen')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
