export const checkInSchema = {
  type: 'object',
  required: [
    'id',
    'gymId',
    'memberId',
    'checkedInAt',
    'checkedOutAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    memberId: { type: 'string', format: 'uuid' },
    checkedInAt: { type: 'string', format: 'date-time' },
    checkedOutAt: { type: 'string', format: 'date-time', nullable: true },
    updatedAt: { type: 'string', format: 'date-time' },
    member: {
      type: 'object',
      required: [
        'id',
        'gymId',
        'name',
        'email',
        'status',
        'joinedAt',
        'createdAt',
        'updatedAt',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        gymId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid', nullable: true },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phoneNumber: { type: 'string', nullable: true },
        dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        joinedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};

export const checkInListSchema = {
  type: 'object',
  required: ['checkIns', 'total'],
  properties: {
    checkIns: {
      type: 'array',
      items: checkInSchema,
    },
    total: {
      type: 'integer',
      minimum: 0,
    },
  },
};
