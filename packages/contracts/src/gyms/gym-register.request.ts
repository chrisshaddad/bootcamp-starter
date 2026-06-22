import { z } from 'zod';

export const gymRegisterRequestSchema = z.object({
  name: z.string().trim().min(1, 'Gym name is required'),
  ownerName: z.string().trim().min(1, 'Owner name is required'),
  email: z.string().email('Valid email is required'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number is too long')
    .regex(/^\+?[\d\s\-().]+$/, 'Phone number contains invalid characters'),
  address: z.string().trim().min(1, 'Address is required'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
export type GymRegisterRequest = z.infer<typeof gymRegisterRequestSchema>;
