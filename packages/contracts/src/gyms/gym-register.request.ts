import { z } from 'zod';

export const gymRegisterRequestSchema = z.object({
  name: z.string().min(1, 'Gym name is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone number must be at least 7 characters').max(20, 'Phone number is too long'),
  address: z.string().min(1, 'Address is required'),
  description: z
    .string()
    .refine(
      (val) => val.trim() === '' || val.trim().split(/\s+/).length <= 200,
      { message: 'Description must not exceed 200 words' },
    )
    .optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
export type GymRegisterRequest = z.infer<typeof gymRegisterRequestSchema>;
