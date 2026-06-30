/** Enum values for instructor status filtering (UI-level; not a DB enum) */
export const INSTRUCTOR_STATUS_ENUM = ['active', 'inactive'] as const;

/** Shared inline JSON Schema object describing an instructor, reused across Swagger @ApiResponse decorators */
export const instructorSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    gymId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email', nullable: true },
    specialization: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
