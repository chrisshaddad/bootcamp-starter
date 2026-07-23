import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';

export const userCreateRequestSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.email(),
    role: userRoleSchema,
    organizationId: z.uuid().optional(),
    departmentId: z.uuid().optional(),
    managerId: z.uuid().optional(),
    title: z.string().max(100).optional(),
    level: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    // Only SUPER_ADMIN users are platform-level with no organization - see
    // the User.organizationId comment in schema.prisma.
    if (data.role === 'SUPER_ADMIN') {
      if (data.organizationId) {
        ctx.addIssue({
          code: 'custom',
          path: ['organizationId'],
          message: 'Super Admin users cannot belong to an organization',
        });
      }
    } else if (!data.organizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message: 'organizationId is required for this role',
      });
    }
  });

export type UserCreateRequest = z.infer<typeof userCreateRequestSchema>;
