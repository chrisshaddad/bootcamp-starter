export const IMPORT_QUEUE = 'imports';

export const IMPORT_JOBS = {
  PROCESS_FILE: 'process-file',
} as const;

// The allowed field names for each import type
export const EXPENSE_IMPORT_FIELDS = [
  'date',
  'description',
  'amount',
  'categoryId',
  'recurrence',
  'notes',
] as const;

export const SALE_IMPORT_FIELDS = [
  'date',
  'description',
  'quantity',
  'unitPrice',
  'unitCost',
  'productId',
  'recurrence',
  'notes',
] as const;
