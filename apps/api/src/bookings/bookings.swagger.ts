/** Shared inline JSON Schema for a booking, reused across Swagger @ApiResponse decorators */
export const bookingSchema = {
  type: 'object',
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
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
  },
};
