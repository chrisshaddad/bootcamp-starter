export const PROJECT_INVITATIONS_QUEUE = 'project-invitations';

export const PROJECT_INVITATION_JOBS = {
  EXPIRE_PENDING: 'expire-pending-project-invitations',
} as const;

export const PROJECT_INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
