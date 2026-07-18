import { z } from 'zod';

export const savedProjectIdsResponseSchema = z.array(z.string());

export type SavedProjectIdsResponse = z.infer<
  typeof savedProjectIdsResponseSchema
>;
