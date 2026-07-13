import { z } from 'zod';

// Who sent an inquiry message: the client who opened the inquiry, or a pharmacy
// employee (officer/admin) replying. Drives chat styling and — on the inquiry
// queue — whether the ball is in the officer's court (last message from CLIENT).
export const senderTypeSchema = z.enum(['CLIENT', 'EMPLOYEE']);
export type SenderType = z.infer<typeof senderTypeSchema>;
