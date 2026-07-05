// Reserved id for the platform institution — see the comment on the
// Institution model in schema.prisma. SUPER_ADMIN users attach to this row
// instead of a real institution, since institutionId is required on User.
export const PLATFORM_INSTITUTION_ID = '00000000-0000-0000-0000-000000000000';
