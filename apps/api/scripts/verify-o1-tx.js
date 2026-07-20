/* O1 verification (live DB): prove checkout activation is atomic.
 * Throwaway — lives under apps/api/scripts so bare requires resolve from
 * apps/api/node_modules. Absolute paths for env + dist so cwd doesn't matter. */
const API_DIR = '/home/mouhannad/Projects/Forward-Mena/apps/api';
require('dotenv').config({ path: API_DIR + '/.env.local' });
require('tsconfig-paths').register({
  baseUrl: API_DIR + '/dist',
  paths: { '@/*': ['*'] },
});

const { PrismaClient } = require('@repo/db');
const { PrismaPg } = require('@prisma/adapter-pg');
const {
  WebhooksService,
} = require(API_DIR + '/dist/modules/webhooks/webhooks.service');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TAG = 'O1-VERIFY-' + process.pid;
const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail ?? ''}`);
};

function checkoutEvent(orgId) {
  return {
    id: 'evt_' + TAG,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_' + TAG,
        metadata: { orgId, planKey: 'standard' },
        customer: 'cus_' + TAG,
        subscription: 'sub_' + TAG,
      },
    },
  };
}

async function partA_rollback() {
  const org = await prisma.organization.create({
    data: { name: TAG + '-A', status: 'PENDING' },
  });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { orgId: org.id },
        create: {
          orgId: org.id,
          stripeSubscriptionId: 'sub_A_' + TAG,
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE' },
      });
      await tx.organization.update({
        where: { id: org.id },
        data: { status: 'ACTIVE' },
      });
      // Both writes executed; now fail — a real DB must roll BOTH back.
      throw new Error('simulated mid-handler failure');
    });
  } catch {
    /* expected */
  }
  const after = await prisma.organization.findUnique({ where: { id: org.id } });
  const sub = await prisma.subscription.findUnique({
    where: { orgId: org.id },
  });
  record(
    'A: org stays PENDING after mid-tx failure',
    after.status === 'PENDING',
    `status=${after.status}`,
  );
  record(
    'A: no subscription row persisted after rollback',
    sub === null,
    `sub=${sub ? 'EXISTS' : 'null'}`,
  );
  return org.id;
}

async function partB_commit() {
  const org = await prisma.organization.create({
    data: { name: TAG + '-B', status: 'PENDING' },
  });
  const service = new WebhooksService(
    prisma,
    { emit: async () => {} },
    {
      searchUsersByOrg: async () => [],
      getUsersWithClientRole: async () => [],
      setSingleClientRole: async () => {},
    },
  );

  await service.handleEvent(checkoutEvent(org.id));

  const after = await prisma.organization.findUnique({ where: { id: org.id } });
  const sub = await prisma.subscription.findUnique({
    where: { orgId: org.id },
  });
  record(
    'B: real handleCheckoutCompleted activates org',
    after.status === 'ACTIVE' && after.stripeCustomerId === 'cus_' + TAG,
    `status=${after.status} customer=${after.stripeCustomerId}`,
  );
  record(
    'B: subscription row created ACTIVE in same handler',
    !!sub &&
      sub.status === 'ACTIVE' &&
      sub.stripeSubscriptionId === 'sub_' + TAG,
    `sub=${sub ? sub.status + '/' + sub.stripeSubscriptionId : 'null'}`,
  );
  return org.id;
}

(async () => {
  const created = [];
  try {
    created.push(await partA_rollback());
    created.push(await partB_commit());
  } catch (e) {
    console.log('SCRIPT ERROR:', e && e.stack ? e.stack : e);
  } finally {
    for (const orgId of created) {
      await prisma.subscription.deleteMany({ where: { orgId } }).catch(() => {});
      await prisma.organization
        .deleteMany({ where: { id: orgId } })
        .catch(() => {});
    }
    await prisma.organization
      .deleteMany({ where: { name: { startsWith: TAG } } })
      .catch(() => {});
    await prisma.$disconnect();
  }
  const allPass = results.length === 4 && results.every((r) => r.pass);
  console.log(
    '\n=== VERDICT ===',
    allPass ? 'PASS' : 'FAIL',
    `(${results.filter((r) => r.pass).length}/${results.length})`,
  );
  process.exit(allPass ? 0 : 1);
})();
