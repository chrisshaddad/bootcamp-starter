import { z } from 'zod';
import { staffRoleSchema } from './staff-role.schema';

// Request for POST /users — Institution Admin creates a Staff member,
// Professional, or another Institution Admin. Professionals require a
// specialty (which seeds their ProfessionalProfile).
export const userCreateRequestSchema = z
  .object({
    fullName: z.string().min(1),
    email: z.email(),
    phone: z.string().min(1),
    role: staffRoleSchema,
    specialty: z.string().min(1).optional(),
    bio: z.string().optional(),
  })
  .refine((data) => data.role !== 'PROFESSIONAL' || !!data.specialty, {
    message: 'Specialty is required for professionals',
    path: ['specialty'],
  });
export type UserCreateRequest = z.infer<typeof userCreateRequestSchema>;
