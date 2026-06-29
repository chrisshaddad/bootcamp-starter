import { ForbiddenException } from '@nestjs/common';
import { OrgScopeService } from './org-scope.service';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import type { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';

describe('OrgScopeService', () => {
  let service: OrgScopeService;

  const callerOrgId = 'org-aaa';
  const otherOrgId = 'org-bbb';
  const callerId = 'user-111';

  const caller: AuthenticatedUser = {
    sub: callerId,
    email: 'admin@example.com',
    realmRoles: ['org_admin'],
    roles: [Role.ORG_ADMIN],
    orgId: callerOrgId,
  };

  // Stubbed Keycloak admin: resolveOrgId() falls back to getUser() only when the
  // token carries no org_id. Tests set `getUserResult` to drive that branch.
  let getUserResult: Record<string, unknown> | null;
  const keycloakAdmin = {
    getUser: async () => getUserResult,
  } as unknown as KeycloakAdminService;

  beforeEach(() => {
    getUserResult = null;
    service = new OrgScopeService(keycloakAdmin);
  });

  describe('resolveForCaller', () => {
    it('returns org + role from the token claims', () => {
      const ctx = service.resolveForCaller(caller);
      expect(ctx).toEqual({ orgId: callerOrgId, role: Role.ORG_ADMIN });
    });

    it('picks the highest-precedence role when several are present', () => {
      const ctx = service.resolveForCaller({
        ...caller,
        roles: [Role.MAINTENANCE, Role.SUPERVISOR],
      });
      expect(ctx.role).toBe(Role.SUPERVISOR);
    });

    it('throws ForbiddenException when the token has no org_id', () => {
      expect(() =>
        service.resolveForCaller({ ...caller, orgId: undefined }),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the token carries no app role', () => {
      expect(() => service.resolveForCaller({ ...caller, roles: [] })).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('resolveOrgId', () => {
    it('returns org_id from the token when present (no Keycloak lookup)', async () => {
      await expect(service.resolveOrgId(caller)).resolves.toBe(callerOrgId);
    });

    it('falls back to the Keycloak org_id attribute when the token lacks it', async () => {
      getUserResult = { attributes: { org_id: [callerOrgId] } };
      await expect(
        service.resolveOrgId({ ...caller, orgId: undefined }),
      ).resolves.toBe(callerOrgId);
    });

    it('throws ForbiddenException when neither token nor Keycloak has an org_id', async () => {
      getUserResult = { attributes: {} };
      await expect(
        service.resolveOrgId({ ...caller, orgId: undefined }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assertSameOrg', () => {
    it('does not throw when orgIds match', () => {
      expect(() =>
        service.assertSameOrg(callerOrgId, callerOrgId),
      ).not.toThrow();
    });

    it('throws ForbiddenException on cross-org access attempt', () => {
      // CRITICAL: caller in org-aaa tries to access an org-bbb resource
      expect(() => service.assertSameOrg(callerOrgId, otherOrgId)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('orgWhere', () => {
    it('returns scoped where clause', () => {
      expect(service.orgWhere(callerOrgId)).toEqual({ orgId: callerOrgId });
    });
  });

  describe('tenantWhere', () => {
    it('adds actorId constraint for tenant scope', () => {
      expect(service.tenantWhere(callerOrgId, callerId)).toEqual({
        orgId: callerOrgId,
        actorId: callerId,
      });
    });
  });
});
