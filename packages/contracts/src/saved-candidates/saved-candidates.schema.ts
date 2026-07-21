import { z } from 'zod';

export const candidateStatusSchema = z.enum([
  'SAVED',
  'CONTACTED',
  'REJECTED',
  'ACCEPTED',
]);
export type CandidateStatus = z.infer<typeof candidateStatusSchema>;

export const savedCandidateCreateRequestSchema = z.object({
  candidateId: z.string().uuid(),
  note: z.string().optional(),
});
export type SavedCandidateCreateRequest = z.infer<
  typeof savedCandidateCreateRequestSchema
>;

export const savedCandidateUpdateRequestSchema = z.object({
  status: candidateStatusSchema.optional(),
  note: z.string().nullable().optional(),
});
export type SavedCandidateUpdateRequest = z.infer<
  typeof savedCandidateUpdateRequestSchema
>;

export const savedCandidateResponseSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  savedByUserId: z.string().uuid(),
  status: candidateStatusSchema,
  note: z.string().nullable(),
  createdAt: z.string(),
  candidate: z.object({
    id: z.string().uuid(),
    publicSlug: z.string(),
    displayName: z.string(),
    headline: z.string().nullable(),
    profilePictureUrl: z.string().nullable(),
  }),
});
export type SavedCandidateResponse = z.infer<
  typeof savedCandidateResponseSchema
>;

export const savedCandidatesListResponseSchema = z.object({
  data: z.array(savedCandidateResponseSchema),
});
export type SavedCandidatesListResponse = z.infer<
  typeof savedCandidatesListResponseSchema
>;
