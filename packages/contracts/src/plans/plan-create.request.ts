import { z } from 'zod';

export const planCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional(),
  durationDays: z
    .number()
    .int('Duration must be a whole number')
    .positive('Duration must be at least 1 day'),
  price: z
    .number()
    .int('Price must be a whole number of cents')
    .nonnegative('Price must be non-negative'),
});
export type PlanCreateRequest = z.infer<typeof planCreateRequestSchema>;
