import { z } from 'zod';

export const planUpdateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .nullable()
    .optional(),
  durationDays: z
    .number()
    .int('Duration must be a whole number')
    .positive('Duration must be at least 1 day')
    .optional(),
  price: z
    .number()
    .int('Price must be a whole number of cents')
    .nonnegative('Price must be non-negative')
    .optional(),
  isActive: z.boolean().optional(),
});
export type PlanUpdateRequest = z.infer<typeof planUpdateRequestSchema>;
