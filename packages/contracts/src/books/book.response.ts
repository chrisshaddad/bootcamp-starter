import { z } from 'zod';
import { dateSchema } from '../common';

const bookPublisherSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const bookAuthorSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const bookCategorySummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

// Response shape for a single Book
export const bookResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  publisherId: z.uuid().nullable(),
  isbn: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  publishedDate: dateSchema.nullable(),
  language: z.string().nullable(),
  pageCount: z.number().nullable(),
  coverUrl: z.string().nullable(),
  // Prisma Decimal serializes to a string over the wire (see dateSchema's
  // Date handling for the same JSON.stringify + toJSON() pattern).
  salePrice: z.string().nullable(),
  edition: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  publisher: bookPublisherSummarySchema.nullable(),
  authors: z.array(bookAuthorSummarySchema),
  categories: z.array(bookCategorySummarySchema),
  availableCopies: z.number(),
});
export type BookResponse = z.infer<typeof bookResponseSchema>;
