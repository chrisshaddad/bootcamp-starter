export const MEMBER_STATUS_ENUM = ['ACTIVE', 'INACTIVE'];

export const memberSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid', nullable: true },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phoneNumber: { type: 'string' },
    dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
    status: { type: 'string', enum: MEMBER_STATUS_ENUM },
    joinedAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
