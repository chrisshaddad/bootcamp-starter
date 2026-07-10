import { z } from 'zod';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color in #RRGGBB format');

export const gymSettingsUpdateRequestSchema = z.object({
  maxCapacity: z.number().int().positive().nullable().optional(),
  themeColor: hexColorSchema.nullable().optional(),
});
export type GymSettingsUpdateRequest = z.infer<
  typeof gymSettingsUpdateRequestSchema
>;
