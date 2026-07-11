import type { AuditLogItem } from '@repo/contracts';

// Shared "how a person reads an audit event" helpers. Raw event keys
// (`user.create`, `auth.magic_link_requested`) are system identifiers; both the
// audit console and the notification bell derive their human labels, categories,
// and destination links from here, so the two never drift.

// Turn any identifier into Title Case words. Handles camelCase / PascalCase
// (phoneNumber, PharmacyBranch), snake_case, and dot.case (auth.set_password),
// plus ALL_CAPS enums (PHARMACY_ADMIN) — so nothing raw leaks into the UI.
export function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_.]+/g, ' ') // snake_case / dot.case → spaces
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Category is the scan axis: color + filter both key off it, so a reader can
// spot destructive events (red) without reading every row.
export type Category = 'create' | 'update' | 'delete' | 'login' | 'security';

export const CATEGORY_META: Record<Category, { label: string; pill: string }> =
  {
    create: { label: 'Create', pill: 'bg-success/10 text-success-dark' },
    update: { label: 'Update', pill: 'bg-warning/15 text-warning-dark' },
    delete: { label: 'Delete', pill: 'bg-error/10 text-error' },
    login: { label: 'Login', pill: 'bg-primary-100 text-primary-hover' },
    security: { label: 'Security', pill: 'bg-secondary-200 text-warning-dark' },
  };

export const CATEGORY_ORDER: Category[] = [
  'create',
  'update',
  'delete',
  'login',
  'security',
];

export interface ActionMeta {
  category: Category;
  label: string;
}

// The canonical map from raw event key to how a person reads it.
const ACTION_META: Record<string, ActionMeta> = {
  'user.create': { category: 'create', label: 'Created a new user' },
  'user.update': { category: 'update', label: 'Updated a user' },
  'user.delete': { category: 'delete', label: 'Deleted a user' },
  'user.assign_branch': {
    category: 'update',
    label: 'Assigned a user to a branch',
  },
  'profile.update': { category: 'update', label: 'Updated their profile' },
  'medicine.create': { category: 'create', label: 'Created a medicine' },
  'medicine.update': { category: 'update', label: 'Updated a medicine' },
  'medicine.delete': { category: 'delete', label: 'Deleted a medicine' },
  'pharmacy.create': { category: 'create', label: 'Created a pharmacy' },
  'pharmacy.delete': { category: 'delete', label: 'Deleted a pharmacy' },
  'branch.create': { category: 'create', label: 'Created a branch' },
  'branch.update': { category: 'update', label: 'Updated a branch' },
  'branch.delete': { category: 'delete', label: 'Deleted a branch' },
  'auth.login': { category: 'login', label: 'Logged in' },
  'auth.logout': { category: 'login', label: 'Logged out' },
  'auth.signup': { category: 'create', label: 'Signed up (new account)' },
  'auth.magic_link_requested': {
    category: 'security',
    label: 'Requested a magic link',
  },
  'auth.set_password': { category: 'security', label: 'Set a password' },
};

// Fallback for any event key not in the map above — keyword-classify so a new
// action still lands in a sensible category and reads in plain-ish language.
function keywordCategory(action: string): Category {
  const value = action.toLowerCase();
  if (/(delete|remove|revoke|suspend|ban)/.test(value)) return 'delete';
  if (/(create|add|invite|register|signup)/.test(value)) return 'create';
  if (/(login|logout|access|view|session)/.test(value)) return 'login';
  if (/(password|magic|token|security|mfa|2fa)/.test(value)) return 'security';
  return 'update';
}

export function actionMeta(action: string): ActionMeta {
  return (
    ACTION_META[action] ?? {
      category: keywordCategory(action),
      label: humanize(action),
    }
  );
}

// Where a notification for a given event should take the super admin. Events map
// to the console that owns the affected entity; auth/session events go to the
// audit log (where login history lives). Deletes and unknown targets fall back
// to the entity's list page rather than a detail route that would 404.
export function notificationHref(
  item: Pick<AuditLogItem, 'action' | 'entity' | 'entityId'>,
): string {
  if (item.action.startsWith('auth.')) return '/admin/audit';

  const isDelete = item.action.includes('delete');
  switch (item.entity) {
    case 'User':
      return '/admin/users';
    case 'Medicine':
      return '/admin/medicines';
    case 'Pharmacy':
      return !isDelete && item.entityId
        ? `/admin/pharmacies/${item.entityId}`
        : '/admin/pharmacies';
    case 'PharmacyBranch':
      return '/admin/pharmacies';
    default:
      return '/admin/audit';
  }
}
