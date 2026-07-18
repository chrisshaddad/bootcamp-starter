import { projectInvitationResponseSchema } from './project-invitation.response';

export const cancelProjectInvitationResponseSchema =
  projectInvitationResponseSchema;
export type CancelProjectInvitationResponse =
  typeof projectInvitationResponseSchema._output;
