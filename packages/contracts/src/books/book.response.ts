import { z } from 'zod';
import { dateSchema } from '../common';
import { bookConditionPriceResponseSchema } from './book-condition-price.schema';

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
  conditionPrices: z.array(bookConditionPriceResponseSchema),
  edition: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  publisher: bookPublisherSummarySchema.nullable(),
  authors: z.array(bookAuthorSummarySchema),
  categories: z.array(bookCategorySummarySchema),
  availableCopies: z.number(),
});
export type BookResponse = z.infer<typeof bookResponseSchema>;
