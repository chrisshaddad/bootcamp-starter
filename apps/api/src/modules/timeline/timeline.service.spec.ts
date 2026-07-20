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

  function makeService(rows: unknown[] = [], total = 0) {
    const prisma: any = {
      event: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
    };
    return { service: new TimelineService(prisma), prisma };
  }

  const caller = (roles: string[]): AuthenticatedUser =>
    ({ sub: 'user-1', roles } as unknown as AuthenticatedUser);

  it('returns the paginated envelope keyed by `items`, not `data`', async () => {
    const rows = [{ id: 'evt-1' }, { id: 'evt-2' }];
    const { service } = makeService(rows, 2);

    const result = await service.findForCaller(orgId, caller(['org_admin']), 1, 20);

    expect(result).toEqual({ items: rows, total: 2, page: 1, limit: 20 });
    expect(result.items).toEqual(rows);
    expect(result).not.toHaveProperty('data');
  });
});
