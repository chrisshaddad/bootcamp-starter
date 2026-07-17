import { z } from 'zod';

// Response from POST /chat — the assistant's reply for this turn. Tool calls
// and their results are resolved server-side inside the request; only the final
// natural-language answer is returned.
export const chatResponseSchema = z.object({
  reply: z.string(),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;
