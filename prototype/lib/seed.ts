// Deterministic mock dataset: "Cog & Sprocket Cycles", a bike shop that sells
// Products (bikes, parts) and Services (repairs, builds). Numbers are tuned so the
// dashboard and AI insights have a clear story: a high-margin top performer, a
// low-margin laggard, positive-but-thin net margin, and a meaningful break-even.

import type {
  User,
  Organization,
  Member,
  Item,
  Sale,
  ExpenseCategory,
  Expense,
  OrgDataset,
} from "./types";

export const DEMO_ORG_ID = "org-cogandsprocket";

export const DEMO_USER: User = {
  id: "user-alex",
  name: "Alex Rivera",
  email: "alex@cogandsprocket.com",
  avatarColor: "#7C4DFF",
};

const TEAMMATES: User[] = [
  { id: "user-jordan", name: "Jordan Lee", email: "jordan@cogandsprocket.com", avatarColor: "#22D3EE" },
  { id: "user-sam", name: "Sam Patel", email: "sam@cogandsprocket.com", avatarColor: "#E879F9" },
  { id: "user-riley", name: "Riley Chen", email: "riley@cogandsprocket.com", avatarColor: "#34D39A" },
];

const MONTHS = ["2026-04-15", "2026-05-15", "2026-06-15"];

interface ItemSpec {
  key: string;
  name: string;
  type: Item["type"];
  price: number;
  unitCost: number;
  /** Units sold per month, aligned with MONTHS. */
  qty: [number, number, number];
}

const ITEM_SPECS: ItemSpec[] = [
  { key: "road-bike", name: "Road Bike", type: "PRODUCT", price: 1800, unitCost: 1250, qty: [3, 4, 5] },
  { key: "hybrid-bike", name: "Hybrid Bike", type: "PRODUCT", price: 850, unitCost: 560, qty: [5, 6, 8] },
  { key: "helmet", name: "Helmet", type: "PRODUCT", price: 75, unitCost: 38, qty: [22, 25, 30] },
  { key: "inner-tube", name: "Inner Tube", type: "PRODUCT", price: 9, unitCost: 6, qty: [60, 70, 85] },
  { key: "bike-lock", name: "Bike Lock", type: "PRODUCT", price: 45, unitCost: 27, qty: [14, 16, 18] },
  { key: "basic-tuneup", name: "Basic Tune-up", type: "SERVICE", price: 60, unitCost: 12, qty: [30, 35, 40] },
  { key: "full-service", name: "Full Service", type: "SERVICE", price: 150, unitCost: 35, qty: [8, 10, 12] },
  { key: "wheel-build", name: "Wheel Build", type: "SERVICE", price: 120, unitCost: 45, qty: [4, 5, 6] },
  { key: "flat-repair", name: "Flat Repair", type: "SERVICE", price: 20, unitCost: 4, qty: [25, 28, 30] },
];

interface CategorySpec {
  key: string;
  name: string;
  color: string;
  recurring: boolean;
  /** Fixed monthly amount, or per-month amounts aligned with MONTHS. */
  monthly: number | [number, number, number];
}

const CATEGORY_SPECS: CategorySpec[] = [
  { key: "rent", name: "Rent", color: "#7C4DFF", recurring: true, monthly: 2200 },
  { key: "payroll", name: "Payroll", color: "#22D3EE", recurring: true, monthly: 3800 },
  { key: "supplies", name: "Parts & Supplies", color: "#E879F9", recurring: false, monthly: [560, 640, 600] },
  { key: "marketing", name: "Marketing", color: "#34D39A", recurring: false, monthly: [400, 520, 450] },
  { key: "utilities", name: "Utilities", color: "#FBBF24", recurring: true, monthly: 280 },
  { key: "insurance", name: "Insurance", color: "#F4506A", recurring: true, monthly: 190 },
];

const MONTH_LABEL = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

/**
 * Build a complete sample dataset for an organization. Used both for the default
 * seeded org and when a user creates a new organization (so every path shows data).
 */
export function buildSampleDataset(
  org: Organization,
  owner: User,
  includeTeammates = true,
): OrgDataset {
  const orgId = org.id;

  const items: Item[] = ITEM_SPECS.map((s) => ({
    id: `item-${orgId}-${s.key}`,
    orgId,
    name: s.name,
    type: s.type,
    price: s.price,
    unitCost: s.unitCost,
    createdAt: org.createdAt,
  }));

  const sales: Sale[] = [];
  ITEM_SPECS.forEach((s) => {
    MONTHS.forEach((month, mi) => {
      sales.push({
        id: `sale-${orgId}-${s.key}-${mi}`,
        orgId,
        itemId: `item-${orgId}-${s.key}`,
        quantity: s.qty[mi],
        soldAt: month,
      });
    });
  });

  const categories: ExpenseCategory[] = CATEGORY_SPECS.map((c) => ({
    id: `cat-${orgId}-${c.key}`,
    orgId,
    name: c.name,
    color: c.color,
    recurring: c.recurring,
  }));

  const expenses: Expense[] = [];
  CATEGORY_SPECS.forEach((c) => {
    MONTHS.forEach((month, mi) => {
      const amount = Array.isArray(c.monthly) ? c.monthly[mi] : c.monthly;
      expenses.push({
        id: `exp-${orgId}-${c.key}-${mi}`,
        orgId,
        categoryId: `cat-${orgId}-${c.key}`,
        description: `${c.name} — ${MONTH_LABEL(month)}`,
        amount,
        date: month,
        cadence: c.recurring ? "MONTHLY" : "ONE_OFF",
      });
    });
  });

  const members: Member[] = [
    {
      id: `mem-${orgId}-${owner.id}`,
      userId: owner.id,
      orgId,
      role: "ADMIN",
      status: "ACTIVE",
      joinedAt: org.createdAt,
      user: owner,
    },
  ];

  if (includeTeammates) {
    members.push(
      {
        id: `mem-${orgId}-jordan`,
        userId: TEAMMATES[0].id,
        orgId,
        role: "ADMIN",
        status: "ACTIVE",
        joinedAt: "2026-03-05",
        user: TEAMMATES[0],
      },
      {
        id: `mem-${orgId}-sam`,
        userId: TEAMMATES[1].id,
        orgId,
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: "2026-04-10",
        user: TEAMMATES[1],
      },
      {
        id: `mem-${orgId}-riley`,
        userId: TEAMMATES[2].id,
        orgId,
        role: "MEMBER",
        status: "INVITED",
        joinedAt: "2026-06-10",
        user: TEAMMATES[2],
      },
    );
  }

  return { organization: org, members, items, sales, categories, expenses };
}

export const DEMO_ORG: Organization = {
  id: DEMO_ORG_ID,
  name: "Cog & Sprocket Cycles",
  businessType: "Bike shop",
  currency: "USD",
  createdAt: "2026-03-01",
};

/** The default dataset loaded on first run. */
export function buildSeed(): OrgDataset {
  return buildSampleDataset(DEMO_ORG, DEMO_USER, true);
}

export const ALL_SEED_USERS: User[] = [DEMO_USER, ...TEAMMATES];
