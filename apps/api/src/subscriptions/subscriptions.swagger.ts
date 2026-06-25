export const SUBSCRIPTION_STATUS_ENUM = ['ACTIVE', 'EXPIRED', 'CANCELLED'];

export const subscriptionPlanSchema = {
  type: 'object',
  nullable: true,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    durationDays: { type: 'integer', example: 30 },
    isActive: { type: 'boolean' },
  },
};

export const subscriptionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    memberId: { type: 'string', format: 'uuid' },
    planId: { type: 'string', format: 'uuid', nullable: true },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    price: {
      type: 'integer',
      example: 2999,
      description: 'Snapshotted price in cents',
    },
    status: { type: 'string', enum: SUBSCRIPTION_STATUS_ENUM },
    plan: subscriptionPlanSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
