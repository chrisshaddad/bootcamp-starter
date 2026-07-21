import { TimelineService } from './timeline.service';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

/**
 * Regression guard for the paginated-list contract drift bug: the timeline feed
 * envelope MUST expose its rows under `items` (matching PaginatedResponse<T> in
 * @repo/contracts and the FE reads), never `data`. A `data` array here silently
 * renders every "Recent activity" feed empty on the client.
 */
describe('TimelineService', () => {
  const orgId = 'org-1';

  function makeService(
    rows: unknown[] = [],
    total = 0,
    overrides: { keycloakAdmin?: Partial<Record<string, jest.Mock>> } = {},
  ) {
    const prisma: any = {
      event: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
    };
    const keycloakAdmin = {
      getUser: jest.fn().mockResolvedValue(null),
      ...overrides.keycloakAdmin,
    };
    return {
      service: new TimelineService(prisma, keycloakAdmin as any),
      prisma,
      keycloakAdmin,
    };
  }

  const caller = (roles: string[]): AuthenticatedUser =>
    ({ sub: 'user-1', roles } as unknown as AuthenticatedUser);

  it('returns the paginated envelope keyed by `items`, not `data`', async () => {
    const rows = [{ id: 'evt-1' }, { id: 'evt-2' }];
    const { service } = makeService(rows, 2);

    const result = await service.findForCaller(orgId, caller(['org_admin']), 1, 20);

    expect(result).toEqual({
      items: [
        { id: 'evt-1', actorName: null },
        { id: 'evt-2', actorName: null },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
    expect(result).not.toHaveProperty('data');
  });

  describe('actorName enrichment (F5.2)', () => {
    it('resolves the actor name once for two events by the same actor (dedupe/cache)', async () => {
      const rows = [
        { id: 'evt-1', actorId: 'user-a' },
        { id: 'evt-2', actorId: 'user-a' },
      ];
      const { service, keycloakAdmin } = makeService(rows, 2, {
        keycloakAdmin: {
          getUser: jest
            .fn()
            .mockResolvedValue({ firstName: 'Jane', lastName: 'Doe' }),
        },
      });

      const result = await service.findForCaller(
        orgId,
        caller(['org_admin']),
        1,
        20,
      );

      expect(result.items).toEqual([
        { id: 'evt-1', actorId: 'user-a', actorName: 'Jane Doe' },
        { id: 'evt-2', actorId: 'user-a', actorName: 'Jane Doe' },
      ]);
      expect(keycloakAdmin.getUser).toHaveBeenCalledTimes(1);
      expect(keycloakAdmin.getUser).toHaveBeenCalledWith('user-a');
    });

    it('caches a resolved actor name across separate findForCaller calls', async () => {
      const rows = [{ id: 'evt-1', actorId: 'user-a' }];
      const { service, keycloakAdmin } = makeService(rows, 1, {
        keycloakAdmin: {
          getUser: jest.fn().mockResolvedValue({ firstName: 'Jane' }),
        },
      });

      await service.findForCaller(orgId, caller(['org_admin']), 1, 20);
      await service.findForCaller(orgId, caller(['org_admin']), 1, 20);

      expect(keycloakAdmin.getUser).toHaveBeenCalledTimes(1);
    });

    it('yields a null actorName for a system-generated event (null actorId)', async () => {
      const rows = [{ id: 'evt-1', actorId: null }];
      const { service, keycloakAdmin } = makeService(rows, 1);

      const result = await service.findForCaller(
        orgId,
        caller(['org_admin']),
        1,
        20,
      );

      expect(result.items).toEqual([
        { id: 'evt-1', actorId: null, actorName: null },
      ]);
      expect(keycloakAdmin.getUser).not.toHaveBeenCalled();
    });

    it('yields a null actorName (never throws) when the Keycloak lookup fails', async () => {
      const rows = [{ id: 'evt-1', actorId: 'user-a' }];
      const { service } = makeService(rows, 1, {
        keycloakAdmin: {
          getUser: jest.fn().mockRejectedValue(new Error('KC unreachable')),
        },
      });

      const result = await service.findForCaller(
        orgId,
        caller(['org_admin']),
        1,
        20,
      );

      expect(result.items).toEqual([
        { id: 'evt-1', actorId: 'user-a', actorName: null },
      ]);
    });

    it('falls back to email when no first/last name is available', async () => {
      const rows = [{ id: 'evt-1', actorId: 'user-a' }];
      const { service } = makeService(rows, 1, {
        keycloakAdmin: {
          getUser: jest.fn().mockResolvedValue({ email: 'jane@example.com' }),
        },
      });

      const result = await service.findForCaller(
        orgId,
        caller(['org_admin']),
        1,
        20,
      );

      expect(result.items[0]).toEqual(
        expect.objectContaining({ actorName: 'jane@example.com' }),
      );
    });
  });
});
