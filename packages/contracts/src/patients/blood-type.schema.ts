import { z } from 'zod';

export const bloodTypeSchema = z.enum([
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'AB_POS',
  'AB_NEG',
  'O_POS',
  'O_NEG',
]);
export type BloodType = z.infer<typeof bloodTypeSchema>;
