import type { Prisma } from '@repo/db';

// Canonical audit action + entity strings. Centralized so the values written by
// services and the ones read/filtered on the console never drift. Convention:
// action = `<entity>.<verb>` in snake/dot case; entity = the Prisma model name.

// Shape stored in an update event's `details.changes`: one entry per field that
// actually changed, carrying both the old and new value so the console can show
// a real before → after diff instead of just the current state.
export type AuditFieldChange = {
  from: Prisma.InputJsonValue | null;
  to: Prisma.InputJsonValue | null;
};
export type AuditChanges = Record<string, AuditFieldChange>;

export const AUDIT_ACTIONS = {
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ASSIGN_BRANCH: 'user.assign_branch',

  MEDICINE_CREATE: 'medicine.create',
  MEDICINE_UPDATE: 'medicine.update',
  MEDICINE_DELETE: 'medicine.delete',

  PHARMACY_CREATE: 'pharmacy.create',
  PHARMACY_DELETE: 'pharmacy.delete',

  BRANCH_CREATE: 'branch.create',
  BRANCH_UPDATE: 'branch.update',
  BRANCH_DELETE: 'branch.delete',

  STOCK_BATCH_CREATE: 'stock_batch.create',
  STOCK_BATCH_UPDATE: 'stock_batch.update',
  STOCK_BATCH_DELETE: 'stock_batch.delete',

  INQUIRY_CREATE: 'inquiry.create',
  INQUIRY_REPLY: 'inquiry.reply',
  INQUIRY_STATUS_CHANGE: 'inquiry.status_change',

  PROFILE_UPDATE: 'profile.update',

  AUTH_MAGIC_LINK_REQUESTED: 'auth.magic_link_requested',
  AUTH_LOGIN: 'auth.login',
  AUTH_SIGNUP: 'auth.signup',
  AUTH_SET_PASSWORD: 'auth.set_password',
  AUTH_LOGOUT: 'auth.logout',
} as const;

export const AUDIT_ENTITIES = {
  USER: 'User',
  MEDICINE: 'Medicine',
  PHARMACY: 'Pharmacy',
  PHARMACY_BRANCH: 'PharmacyBranch',
  STOCK_BATCH: 'StockBatch',
  INQUIRY: 'Inquiry',
} as const;
