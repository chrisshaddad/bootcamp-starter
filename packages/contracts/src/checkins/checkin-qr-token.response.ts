import { z } from 'zod';
import { dateSchema } from '../common';

export const checkinQrTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: dateSchema,
});

export type CheckinQrTokenResponse = z.infer<
  typeof checkinQrTokenResponseSchema
>;
