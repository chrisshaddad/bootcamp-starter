import { PaymentsService } from './payments.service';

/**
 * Regression guard for the paginated-list contract drift bug: the backend list
 * envelope MUST expose its rows under `items` (matching PaginatedResponse<T> in
 * @repo/contracts and the FE reads), never `data`. A `data` array here silently
 * renders empty lists on the client (the FE reads `.items`), and would also be
 * mis-peeled by the client's `unwrap` ApiEnvelope transform.
 */
describe('PaymentsService', () => {
  const orgId = 'org-1';

  function makeService(rows: unknown[] = [], total = 0) {
    const prisma: any = {
      payment: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
    };
    return { service: new PaymentsService(prisma), prisma };
  }

  it('returns the paginated envelope keyed by `items`, not `data`', async () => {
    const rows = [{ id: 'pay-1' }, { id: 'pay-2' }];
    const { service } = makeService(rows, 2);

    const result = await service.findAll(orgId, 1, 20);

    expect(result).toEqual({ items: rows, total: 2, page: 1, limit: 20 });
    expect(result.items).toEqual(rows);
    expect(result).not.toHaveProperty('data');
  });

  it('applies page/limit as skip/take and echoes them back', async () => {
    const { service, prisma } = makeService([], 0);

    const result = await service.findAll(orgId, 3, 10);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId }, skip: 20, take: 10 }),
    );
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });
});
