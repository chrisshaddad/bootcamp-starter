/* Demo seed for presentation — idempotent, additive.
 * Creates ONE ACTIVE org + a small rentals tree (so reports/tenant show real
 * numbers) and 3 Keycloak logins (org_admin / finance / tenant) in OUR realm,
 * wired exactly like the app (client roles on the web client + org_id attr).
 * Run: node apps/api/scripts/seed-demo.js   (cwd anywhere; abs paths used) */
const path = require('path');
const API_DIR = path.resolve(__dirname, '..');
require('dotenv').config({ path: API_DIR + '/.env.local' });
const axios = require('axios');
const { PrismaClient } = require('@repo/db');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const KC = process.env.KEYCLOAK_BASE;
const REALM = process.env.KEYCLOAK_REALM;
const ADMIN_CID = process.env.KEYCLOAK_API_CLIENT_ID;
const ADMIN_SECRET = process.env.KEYCLOAK_API_CLIENT_SECRET;
const WEB_CID = process.env.KEYCLOAK_WEB_CLIENT_ID;
const PASSWORD = 'ForwardDemo!2026';
const ORG_NAME = 'Property Manager Demo Co';

const http = axios.create({ baseURL: KC, timeout: 15000 });
let token;
async function kcToken() {
  if (token) return token;
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ADMIN_CID,
    client_secret: ADMIN_SECRET,
  });
  const { data } = await http.post(
    `/realms/${REALM}/protocol/openid-connect/token`,
    form,
    { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
  );
  token = data.access_token;
  return token;
}
const auth = async () => ({
  headers: { Authorization: `Bearer ${await kcToken()}` },
});

async function ensureUser(username, firstName, lastName, orgId) {
  const a = await auth();
  const found = await http.get(`/admin/realms/${REALM}/users`, {
    ...a,
    params: { username, exact: true },
  });
  const body = {
    username,
    email: username,
    firstName,
    lastName,
    enabled: true,
    emailVerified: true,
    attributes: { org_id: [orgId] },
    requiredActions: [],
    credentials: [{ type: 'password', value: PASSWORD, temporary: false }],
  };
  let id;
  if (found.data.length) {
    id = found.data[0].id;
    await http.put(`/admin/realms/${REALM}/users/${id}`, body, a);
  } else {
    const res = await http.post(`/admin/realms/${REALM}/users`, body, a);
    id = res.headers['location'].split('/').pop();
  }
  return id;
}

async function assignClientRole(userId, roleName) {
  const a = await auth();
  const clients = await http.get(`/admin/realms/${REALM}/clients`, {
    ...a,
    params: { clientId: WEB_CID },
  });
  const clientUuid = clients.data[0].id;
  const roleRep = await http.get(
    `/admin/realms/${REALM}/clients/${clientUuid}/roles/${encodeURIComponent(roleName)}`,
    a,
  );
  try {
    await http.post(
      `/admin/realms/${REALM}/users/${userId}/role-mappings/clients/${clientUuid}`,
      [roleRep.data],
      a,
    );
  } catch (e) {
    if (!(e.response && e.response.status === 409)) throw e;
  }
}

(async () => {
  const out = {};
  // 1) Org (ACTIVE) + Subscription (ACTIVE) — idempotent by name.
  let org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  const fresh = !org;
  if (!org) {
    org = await prisma.organization.create({
      data: { name: ORG_NAME, status: 'ACTIVE' },
    });
  } else {
    await prisma.organization.update({
      where: { id: org.id },
      data: { status: 'ACTIVE' },
    });
  }
  await prisma.subscription.upsert({
    where: { orgId: org.id },
    create: { orgId: org.id, status: 'ACTIVE', planKey: 'standard' },
    update: { status: 'ACTIVE', planKey: 'standard' },
  });
  out.orgId = org.id;

  // 2) Keycloak users.
  const adminSub = await ensureUser('demo.admin@prorentallb.cloud', 'Demo', 'Admin', org.id);
  await assignClientRole(adminSub, 'org_admin');
  const financeSub = await ensureUser('demo.finance@prorentallb.cloud', 'Demo', 'Finance', org.id);
  await assignClientRole(financeSub, 'finance');
  const tenantSub = await ensureUser('demo.tenant@prorentallb.cloud', 'Layla', 'Hassan', org.id);
  await assignClientRole(tenantSub, 'tenant');
  out.users = { adminSub, financeSub, tenantSub };

  // 3) Rentals tree — only build once (skip if org already had it).
  const existingBuilding = await prisma.building.findFirst({
    where: { orgId: org.id },
  });
  if (!existingBuilding) {
    const building = await prisma.building.create({
      data: { orgId: org.id, name: 'Al Manar Residences', code: 'MANAR', address: '12 Corniche Rd' },
    });
    const floor = await prisma.floor.create({
      data: { orgId: org.id, buildingId: building.id, name: 'Ground', order: 1 },
    });
    const apt = await prisma.apartment.create({
      data: {
        orgId: org.id, buildingId: building.id, floorId: floor.id,
        unitNumber: 'G-01', bedrooms: 2, bathrooms: '1.5', status: 'occupied',
      },
    });
    const renter = await prisma.renter.create({
      data: {
        orgId: org.id, fullName: 'Layla Hassan',
        email: 'demo.tenant@prorentallb.cloud', phone: '+971500000000',
        renterUserId: tenantSub,
      },
    });
    const now = new Date();
    const start = new Date(now); start.setMonth(start.getMonth() - 3);
    const end = new Date(now); end.setMonth(end.getMonth() + 9);
    const lease = await prisma.lease.create({
      data: {
        orgId: org.id, buildingId: building.id, floorId: floor.id,
        apartmentId: apt.id, renterId: renter.id,
        startDate: start, endDate: end,
        rentAmount: '1200.00', depositAmount: '1200.00', status: 'active',
      },
    });
    // Invoice #1: last month, fully paid (YTD income).
    const lastMonthDue = new Date(now); lastMonthDue.setMonth(lastMonthDue.getMonth() - 1);
    const inv1 = await prisma.invoice.create({
      data: {
        orgId: org.id, buildingId: building.id, leaseId: lease.id, dueDate: lastMonthDue,
        lineItems: { create: [{ category: 'rent', description: 'Monthly rent', amount: '1200.00' }] },
      },
    });
    await prisma.invoicePayment.create({
      data: { orgId: org.id, invoiceId: inv1.id, amount: '1200.00', method: 'bank_transfer', paidAt: lastMonthDue },
    });
    // Invoice #2: due 5 days ago, only partially paid → overdue + outstanding.
    const overdueDue = new Date(now); overdueDue.setDate(overdueDue.getDate() - 5);
    const paidThisMonth = new Date(now); paidThisMonth.setDate(paidThisMonth.getDate() - 2);
    const inv2 = await prisma.invoice.create({
      data: {
        orgId: org.id, buildingId: building.id, leaseId: lease.id, dueDate: overdueDue,
        lineItems: { create: [{ category: 'rent', description: 'Monthly rent', amount: '1200.00' }] },
      },
    });
    await prisma.invoicePayment.create({
      data: { orgId: org.id, invoiceId: inv2.id, amount: '800.00', method: 'card', paidAt: paidThisMonth },
    });
    // A welcome notification for the tenant (N1 inbox demo).
    await prisma.notification.create({
      data: {
        orgId: org.id, userId: tenantSub, type: 'welcome',
        title: 'Welcome to Property Manager', body: 'Your tenant portal is ready.', data: {},
      },
    });
    out.rentals = { building: building.id, apartment: apt.id, lease: lease.id, invoices: [inv1.id, inv2.id] };
  } else {
    // Ensure the renter link points at the current tenant sub.
    await prisma.renter.updateMany({
      where: { orgId: org.id, email: 'demo.tenant@prorentallb.cloud' },
      data: { renterUserId: tenantSub },
    });
    out.rentals = 'already seeded (renter link refreshed)';
  }

  out.freshOrg = fresh;
  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error('SEED ERROR:', e.response ? JSON.stringify(e.response.data) : e.message);
  await prisma.$disconnect();
  process.exit(1);
});
