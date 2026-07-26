import { OrgRecipientsService } from './org-recipients.service';
import { Role } from '@/common/enums';

describe('OrgRecipientsService', () => {
  const orgId = 'org-1';

  function makeService(
    overrides: {
      searchUsersByOrg?: jest.Mock;
      getUsersWithClientRole?: jest.Mock;
    } = {},
  ) {
    const keycloak = {
      searchUsersByOrg:
        overrides.searchUsersByOrg ??
        jest.fn().mockResolvedValue([{ id: 'admin-1' }, { id: 'tenant-1' }]),
      getUsersWithClientRole:
        overrides.getUsersWithClientRole ??
        jest.fn().mockResolvedValue([{ id: 'admin-1' }]),
    };
    return {
      service: new OrgRecipientsService(keycloak as any),
      keycloak,
    };
  }

  it('returns the users that are both in the org and hold org_admin', async () => {
    const { service, keycloak } = makeService();

    await expect(service.getOrgAdminUserIds(orgId)).resolves.toEqual([
      'admin-1',
    ]);
    expect(keycloak.getUsersWithClientRole).toHaveBeenCalledWith(
      Role.ORG_ADMIN,
    );
  });

  // getUsersWithClientRole spans the whole realm, so the org intersection is
  // the tenancy boundary — without it one org's ticket notifies every org's
  // admins.
  it('excludes org_admins that belong to a different org', async () => {
    const { service } = makeService({
      searchUsersByOrg: jest.fn().mockResolvedValue([{ id: 'admin-1' }]),
      getUsersWithClientRole: jest
        .fn()
        .mockResolvedValue([{ id: 'admin-1' }, { id: 'other-org-admin' }]),
    });

    await expect(service.getOrgAdminUserIds(orgId)).resolves.toEqual([
      'admin-1',
    ]);
  });

  it('omits the excluded actor so nobody is notified of their own action', async () => {
    const { service } = makeService({
      searchUsersByOrg: jest
        .fn()
        .mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]),
      getUsersWithClientRole: jest
        .fn()
        .mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]),
    });

    await expect(service.getOrgAdminUserIds(orgId, 'admin-1')).resolves.toEqual(
      ['admin-2'],
    );
  });

  // Best-effort contract: an unreachable Keycloak must not fail the request
  // that triggered the notification.
  it('resolves to an empty list when Keycloak is unreachable', async () => {
    const { service } = makeService({
      searchUsersByOrg: jest.fn().mockRejectedValue(new Error('KC down')),
    });

    await expect(service.getOrgAdminUserIds(orgId)).resolves.toEqual([]);
  });

  it('caches the roster so a burst of events does not hammer Keycloak', async () => {
    const { service, keycloak } = makeService();

    await service.getOrgAdminUserIds(orgId);
    await service.getOrgAdminUserIds(orgId);
    await service.getOrgAdminUserIds(orgId, 'admin-1');

    expect(keycloak.searchUsersByOrg).toHaveBeenCalledTimes(1);
    expect(keycloak.getUsersWithClientRole).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed lookup', async () => {
    const searchUsersByOrg = jest
      .fn()
      .mockRejectedValueOnce(new Error('KC down'))
      .mockResolvedValue([{ id: 'admin-1' }]);
    const { service } = makeService({ searchUsersByOrg });

    await expect(service.getOrgAdminUserIds(orgId)).resolves.toEqual([]);
    await expect(service.getOrgAdminUserIds(orgId)).resolves.toEqual([
      'admin-1',
    ]);
  });
});
