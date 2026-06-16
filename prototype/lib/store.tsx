"use client";

// Client-side mock store: a single React context backed by useReducer and persisted
// to localStorage. Seeded with the bike shop on first run. No backend — mutations
// update state and re-render, so the prototype feels like a real app.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type {
  User,
  Organization,
  Member,
  Item,
  Sale,
  ExpenseCategory,
  Expense,
  Role,
  OrgDataset,
} from "./types";
import {
  ALL_SEED_USERS,
  DEMO_ORG_ID,
  DEMO_USER,
  buildSampleDataset,
  buildSeed,
} from "./seed";

const STORAGE_KEY = "margin-store-v2";

interface Session {
  userId: string | null;
  orgId: string | null;
  /** Demo-only override of the effective role (role switcher in the topbar). */
  roleOverride: Role | null;
}

interface AppState {
  users: User[];
  organizations: Organization[];
  members: Member[];
  items: Item[];
  sales: Sale[];
  categories: ExpenseCategory[];
  expenses: Expense[];
  session: Session;
}

function initialState(): AppState {
  const seed = buildSeed();
  return {
    users: [...ALL_SEED_USERS],
    organizations: [seed.organization],
    members: seed.members,
    items: seed.items,
    sales: seed.sales,
    categories: seed.categories,
    expenses: seed.expenses,
    session: { userId: DEMO_USER.id, orgId: DEMO_ORG_ID, roleOverride: null },
  };
}

type Action =
  | { type: "HYDRATE"; state: AppState }
  | { type: "RESET" }
  | { type: "SIGN_IN"; name?: string; email: string }
  | { type: "SIGN_OUT" }
  | { type: "SET_DEMO_ROLE"; role: Role | null }
  | { type: "CREATE_ORG"; name: string; businessType?: string }
  | { type: "JOIN_ORG"; orgId: string }
  | { type: "SET_ACTIVE_ORG"; orgId: string }
  | { type: "RENAME_ORG"; name: string }
  | { type: "ADD_ITEM"; item: Omit<Item, "id" | "orgId" | "createdAt"> }
  | { type: "UPDATE_ITEM"; id: string; patch: Partial<Item> }
  | { type: "DELETE_ITEM"; id: string }
  | { type: "ADD_CATEGORY"; category: Omit<ExpenseCategory, "id" | "orgId"> }
  | { type: "UPDATE_CATEGORY"; id: string; patch: Partial<ExpenseCategory> }
  | { type: "DELETE_CATEGORY"; id: string }
  | { type: "ADD_EXPENSE"; expense: Omit<Expense, "id" | "orgId"> }
  | { type: "UPDATE_EXPENSE"; id: string; patch: Partial<Expense> }
  | { type: "DELETE_EXPENSE"; id: string }
  | { type: "SET_MEMBER_ROLE"; memberId: string; role: Role };

const uid = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
};

const AVATAR_COLORS = ["#7C4DFF", "#22D3EE", "#E879F9", "#34D39A", "#FBBF24"];

function reducer(state: AppState, action: Action): AppState {
  const { orgId, userId } = state.session;

  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "RESET":
      return initialState();

    case "SIGN_IN": {
      const existing = state.users.find(
        (u) => u.email.toLowerCase() === action.email.toLowerCase(),
      );
      if (existing) {
        const membership = state.members.find((m) => m.userId === existing.id);
        return {
          ...state,
          session: {
            userId: existing.id,
            orgId: membership?.orgId ?? null,
            roleOverride: null,
          },
        };
      }
      const user: User = {
        id: uid("user"),
        name: action.name?.trim() || action.email.split("@")[0],
        email: action.email,
        avatarColor: AVATAR_COLORS[state.users.length % AVATAR_COLORS.length],
      };
      return {
        ...state,
        users: [...state.users, user],
        session: { userId: user.id, orgId: null, roleOverride: null },
      };
    }

    case "SIGN_OUT":
      return { ...state, session: { userId: null, orgId: null, roleOverride: null } };

    case "SET_DEMO_ROLE":
      return { ...state, session: { ...state.session, roleOverride: action.role } };

    case "SET_ACTIVE_ORG":
      return { ...state, session: { ...state.session, orgId: action.orgId, roleOverride: null } };

    case "RENAME_ORG":
      if (!orgId) return state;
      return {
        ...state,
        organizations: state.organizations.map((o) =>
          o.id === orgId ? { ...o, name: action.name } : o,
        ),
      };

    case "CREATE_ORG": {
      if (!userId) return state;
      const owner = state.users.find((u) => u.id === userId);
      if (!owner) return state;
      const org: Organization = {
        id: uid("org"),
        name: action.name,
        businessType: action.businessType,
        currency: "USD",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      // Attach a fresh sample dataset so the new org has data to explore.
      const ds = buildSampleDataset(org, owner, true);
      return {
        ...state,
        organizations: [...state.organizations, org],
        members: [...state.members, ...ds.members],
        items: [...state.items, ...ds.items],
        sales: [...state.sales, ...ds.sales],
        categories: [...state.categories, ...ds.categories],
        expenses: [...state.expenses, ...ds.expenses],
        session: { ...state.session, orgId: org.id, roleOverride: null },
      };
    }

    case "JOIN_ORG": {
      if (!userId) return state;
      const owner = state.users.find((u) => u.id === userId);
      if (!owner) return state;
      const already = state.members.find(
        (m) => m.userId === userId && m.orgId === action.orgId,
      );
      const members = already
        ? state.members
        : [
            ...state.members,
            {
              id: uid("mem"),
              userId,
              orgId: action.orgId,
              role: "MEMBER" as Role,
              status: "ACTIVE" as const,
              joinedAt: new Date().toISOString().slice(0, 10),
              user: owner,
            },
          ];
      return {
        ...state,
        members,
        session: { ...state.session, orgId: action.orgId, roleOverride: null },
      };
    }

    case "ADD_ITEM":
      if (!orgId) return state;
      return {
        ...state,
        items: [
          ...state.items,
          { ...action.item, id: uid("item"), orgId, createdAt: new Date().toISOString().slice(0, 10) },
        ],
      };
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      };
    case "DELETE_ITEM":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };

    case "ADD_CATEGORY":
      if (!orgId) return state;
      return {
        ...state,
        categories: [...state.categories, { ...action.category, id: uid("cat"), orgId }],
      };
    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c,
        ),
      };
    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        // orphaned expenses are removed with their category
        expenses: state.expenses.filter((e) => e.categoryId !== action.id),
      };

    case "ADD_EXPENSE":
      if (!orgId) return state;
      return {
        ...state,
        expenses: [...state.expenses, { ...action.expense, id: uid("exp"), orgId }],
      };
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };
    case "DELETE_EXPENSE":
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) };

    case "SET_MEMBER_ROLE":
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.memberId ? { ...m, role: action.role } : m,
        ),
      };

    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  hydrated: boolean;
  currentUser: User | null;
  currentOrg: Organization | null;
  currentMember: Member | null;
  /** Effective role for UI gating (member role, with demo override applied). */
  effectiveRole: Role | null;
  isAdmin: boolean;
  /** The current org's data, scoped (mirrors multi-tenant isolation). */
  orgData: OrgDataset | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state after mount (initial render uses the deterministic seed,
  // so server and client markup match — no hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", state: JSON.parse(raw) as AppState });
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state, hydrated]);

  const value = useMemo<StoreValue>(() => {
    const { userId, orgId, roleOverride } = state.session;
    const currentUser = state.users.find((u) => u.id === userId) ?? null;
    const currentOrg = state.organizations.find((o) => o.id === orgId) ?? null;
    const currentMember =
      state.members.find((m) => m.userId === userId && m.orgId === orgId) ?? null;
    const baseRole = currentMember?.role ?? null;
    const effectiveRole = roleOverride ?? baseRole;
    const isAdmin = effectiveRole === "ADMIN" || effectiveRole === "SUPER_ADMIN";

    const orgData: OrgDataset | null =
      currentOrg && orgId
        ? {
            organization: currentOrg,
            members: state.members.filter((m) => m.orgId === orgId),
            items: state.items.filter((i) => i.orgId === orgId),
            sales: state.sales.filter((s) => s.orgId === orgId),
            categories: state.categories.filter((c) => c.orgId === orgId),
            expenses: state.expenses.filter((e) => e.orgId === orgId),
          }
        : null;

    return {
      state,
      dispatch,
      hydrated,
      currentUser,
      currentOrg,
      currentMember,
      effectiveRole,
      isAdmin,
      orgData,
    };
  }, [state, hydrated]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
