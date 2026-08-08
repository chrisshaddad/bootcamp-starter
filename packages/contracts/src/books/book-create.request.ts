import { z } from 'zod';
import { bookConditionPriceInputSchema } from './book-condition-price.schema';
import { bookCopyConditionSchema } from '../book-copies';
import { bookStockRowSchema } from './book-stock.schema';

// Request for POST /books
export const bookCreateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  isbn: z.string().optional(),
  description: z.string().optional(),
  publishedDate: z.coerce.date().optional(),
  language: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
  coverUrl: z.string().optional(),
  // Omitted entirely on update means "leave existing prices untouched"; [] means "clear all
  // prices"; a populated array fully replaces the rate card. Same convention as
  // authorIds/categoryIds below. A condition may appear at most once.
  conditionPrices: z
    .array(bookConditionPriceInputSchema)
    .refine(
      (rows) => new Set(rows.map((r) => r.condition)).size === rows.length,
      'Each condition can be priced at most once',
    )
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
  // Exact available stock by condition. When provided on update, the service
  // reconciles the saved stock to match these quantities.
  stockByCondition: z
    .array(bookStockRowSchema)
    .refine(
      (rows) => new Set(rows.map((r) => r.condition)).size === rows.length,
      'Each condition can appear at most once',
    )
    .optional(),
  // How many new physical copies to add at each condition - on create, this
  // stocks the book immediately; on update, it tops up whatever copies
  // already exist (it never removes/replaces copies - that stays a
  // per-barcode action on the book-copies management UI). Barcodes are
  // auto-generated (see BooksService).
  addCopies: z
    .array(
      z.object({
        condition: bookCopyConditionSchema,
        quantity: z.number().int().min(1).max(500),
      }),
    )
    .refine(
      (rows) => new Set(rows.map((r) => r.condition)).size === rows.length,
      'Each condition can appear at most once',
    )
    .optional(),
});
export type BookCreateRequest = z.infer<typeof bookCreateRequestSchema>;
