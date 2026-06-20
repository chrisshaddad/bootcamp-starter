export const GYM_STATUS_ENUM = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE'];

export const gymUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
  },
};

export const gymDetailSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    status: { type: 'string', enum: GYM_STATUS_ENUM },
    description: { type: 'string', nullable: true },
    website: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    approvedAt: { type: 'string', format: 'date-time', nullable: true },
    createdBy: gymUserSchema,
    approvedBy: { ...gymUserSchema, nullable: true },
    _count: { type: 'object', properties: { users: { type: 'number' } } },
  },
};
