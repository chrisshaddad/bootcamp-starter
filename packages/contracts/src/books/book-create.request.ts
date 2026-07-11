import { z } from 'zod';

// Request for POST /books
export const bookCreateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  isbn: z.string().optional(),
  description: z.string().optional(),
  publishedDate: z.coerce.date().optional(),
  language: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
  coverUrl: z.string().optional(),
  salePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount')
    .optional(),
  edition: z.string().optional(),
  publisherId: z.uuid().optional(),
  // Omitted entirely on create means "no authors/categories yet" (service
  // defaults to []). Left as plain .optional() rather than .default([])
  // so book-update.request.ts (a .partial() of this schema) can tell
  // "field not sent" (undefined -> leave associations untouched) apart
  // from "field sent as []" (explicitly clear associations).
  authorIds: z.array(z.uuid()).optional(),
  categoryIds: z.array(z.uuid()).optional(),
});
export type BookCreateRequest = z.infer<typeof bookCreateRequestSchema>;
