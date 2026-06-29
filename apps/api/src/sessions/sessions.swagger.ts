import { instructorSchema } from '../instructors/instructors.swagger';

export const sessionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    instructorId: { type: 'string', format: 'uuid', nullable: true },
    startsAt: { type: 'string', format: 'date-time' },
    endsAt: { type: 'string', format: 'date-time' },
    capacity: { type: 'number' },
    status: { type: 'string', enum: ['SCHEDULED', 'CANCELLED', 'COMPLETED'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    instructor: { ...instructorSchema, nullable: true },
    _count: {
      type: 'object',
      properties: {
        bookings: { type: 'number' },
      },
      nullable: true,
    },
  },
};
