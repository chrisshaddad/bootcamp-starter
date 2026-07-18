import { projectInvitationResponseSchema } from './project-invitation.response';

export const acceptProjectInvitationResponseSchema =
  projectInvitationResponseSchema;
export type AcceptProjectInvitationResponse =
  typeof projectInvitationResponseSchema._output;
