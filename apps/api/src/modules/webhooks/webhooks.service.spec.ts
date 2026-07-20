import type Stripe from 'stripe';
import { WebhooksService } from './webhooks.service';

/**
 * Focused on the checkout.session.completed atomicity contract (Sprint O1):
 * the subscription upsert and the org activation must run inside ONE
 * prisma.$transaction, subscription-first, so a mid-write failure rolls the
 * whole thing back rather than half-activating an org.
 */
function makeService() {
  const order: string[] = [];
  const tx = {
    subscription: {
      upsert: jest.fn().mockImplementation(async () => {
        order.push('subscription.upsert');
      }),
    },
    organization: {
      update: jest.fn().mockImplementation(async () => {
        order.push('organization.update');
      }),
    },
  };
  const prisma: any = {
    // Top-level clients — assert these are NOT used for the activation writes
    // (everything must go through the transactional `tx`).
    subscription: { upsert: jest.fn(), findFirst: jest.fn() },
    organization: { update: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
  const timeline: any = { emit: jest.fn().mockResolvedValue(undefined) };
  const keycloakAdmin: any = {
    searchUsersByOrg: jest.fn().mockResolvedValue([]),
    getUsersWithClientRole: jest.fn().mockResolvedValue([]),
    setSingleClientRole: jest.fn().mockResolvedValue(undefined),
  };
  const service = new WebhooksService(prisma, timeline, keycloakAdmin);
  return { service, prisma, tx, timeline, keycloakAdmin, order };
}

function checkoutEvent(): Stripe.Event {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        metadata: { orgId: 'org-1', planKey: 'standard' },
        customer: 'cus_1',
        subscription: 'sub_1',
      },
    },
  } as unknown as Stripe.Event;
}

describe('WebhooksService.handleCheckoutCompleted (atomic activation)', () => {
  it('performs both writes inside ONE transaction, subscription-first', async () => {
    const { service, prisma, tx, order } = makeService();

    await service.handleEvent(checkoutEvent());

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.subscription.upsert).toHaveBeenCalledTimes(1);
    expect(tx.organization.update).toHaveBeenCalledTimes(1);
    // Ordering guarantees the org is not flipped ACTIVE before the sub exists.
    expect(order).toEqual(['subscription.upsert', 'organization.update']);

    // The activation writes never bypass the transaction.
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.organization.update).not.toHaveBeenCalled();

    // Correct payloads.
    expect(tx.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: 'org-1' },
        create: expect.objectContaining({
          orgId: 'org-1',
          stripeSubscriptionId: 'sub_1',
          status: 'ACTIVE',
          planKey: 'standard',
        }),
      }),
    );
    expect(tx.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { stripeCustomerId: 'cus_1', status: 'ACTIVE' },
    });
  });

  it('rolls back (rejects, no side effects) when a write inside the transaction fails', async () => {
    const { service, tx, timeline, keycloakAdmin } = makeService();
    tx.organization.update.mockRejectedValueOnce(new Error('DB write failed'));

    await expect(service.handleEvent(checkoutEvent())).rejects.toThrow(
      'DB write failed',
    );

    // The upsert was attempted, but because both are in one $transaction the
    // real DB rolls it back. Crucially, nothing downstream of the transaction
    // runs — no org_admin backstop, no "checkout.completed" timeline event —
    // so a failed activation cannot leave partial post-activation effects.
    expect(tx.subscription.upsert).toHaveBeenCalledTimes(1);
    expect(keycloakAdmin.searchUsersByOrg).not.toHaveBeenCalled();
    expect(timeline.emit).not.toHaveBeenCalled();
  });

  it('emits the timeline event only after the transaction commits', async () => {
    const { service, timeline } = makeService();
    await service.handleEvent(checkoutEvent());
    expect(timeline.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        action: 'checkout.completed',
        targetType: 'Subscription',
      }),
    );
  });
});
