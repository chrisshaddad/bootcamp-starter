import { z } from 'zod';

export const modalityTypeSchema = z.enum([
  'XRAY',
  'MRI',
  'CT',
  'ULTRASOUND',
  'OTHER',
]);
export type ModalityType = z.infer<typeof modalityTypeSchema>;
