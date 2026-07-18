import { projectInvitationResponseSchema } from './project-invitation.response';

export const declineProjectInvitationResponseSchema =
  projectInvitationResponseSchema;
export type DeclineProjectInvitationResponse =
  typeof projectInvitationResponseSchema._output;
