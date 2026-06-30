/** Shared inline JSON Schema for a booking, reused across Swagger @ApiResponse decorators */
export const bookingSchema = {
  type: 'object',
  required: [
    'id',
    'gymId',
    'sessionId',
    'memberId',
    'status',
    'createdAt',
    'updatedAt',
    'member',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    sessionId: { type: 'string', format: 'uuid' },
    memberId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['BOOKED', 'CHECKED_IN', 'CANCELLED'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    member: {
      type: 'object',
      required: ['id', 'name', 'email'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
  },
};
