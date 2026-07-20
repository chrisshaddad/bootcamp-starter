import { z } from 'zod';
import { dateSchema } from '../common';
import { rentalStatusSchema } from './rental-status.schema';
import { bookCopyConditionSchema } from '../book-copies';
import { bookConditionPriceResponseSchema } from '../books';

const rentalBookCopySummarySchema = z.object({
  id: z.uuid(),
  barcode: z.string(),
  condition: bookCopyConditionSchema,
  book: z.object({
    id: z.uuid(),
    title: z.string(),
    coverUrl: z.string().nullable(),
    conditionPrices: z.array(bookConditionPriceResponseSchema),
  }),
});

const rentalMemberSummarySchema = z.object({
  id: z.uuid(),
  libraryCardNumber: z.string(),
});

const rentalStaffSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

// Response shape for a single Rental
export const rentalResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  bookCopyId: z.uuid(),
  memberId: z.uuid(),
  staffId: z.uuid(),
  rentedAt: dateSchema,
  dueDate: dateSchema,
  returnedAt: dateSchema.nullable(),
  status: rentalStatusSchema,
  fineAmount: z.string(),
  finePaid: z.boolean(),
  notes: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  bookCopy: rentalBookCopySummarySchema,
  member: rentalMemberSummarySchema,
  staff: rentalStaffSummarySchema,
});
export type RentalResponse = z.infer<typeof rentalResponseSchema>;
