export const meProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phoneNumber: { type: 'string', nullable: true },
    dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
    joinedAt: { type: 'string', format: 'date-time' },
  },
};

export const meSubscriptionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    planId: { type: 'string', format: 'uuid', nullable: true },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    price: { type: 'number' },
    status: { type: 'string', enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'] },
    plan: {
      nullable: true,
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        durationDays: { type: 'number' },
        isActive: { type: 'boolean' },
      },
    },
  },
};

export const mePlanSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    durationDays: { type: 'number' },
    price: { type: 'number' },
    isActive: { type: 'boolean' },
  },
};

export const meBookingSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    sessionId: { type: 'string', format: 'uuid' },
    memberId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['BOOKED', 'CHECKED_IN', 'CANCELLED'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    session: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time' },
        capacity: { type: 'number' },
        status: {
          type: 'string',
          enum: ['SCHEDULED', 'CANCELLED', 'COMPLETED'],
        },
        instructor: {
          nullable: true,
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
          },
        },
      },
    },
  },
};
