import { z } from 'zod';

export const projectInvitationStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELED',
  'EXPIRED',
]);
export type ProjectInvitationStatus = z.infer<
  typeof projectInvitationStatusSchema
>;
