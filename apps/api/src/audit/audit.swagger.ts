import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

export class AuditLogSchema {
  id!: string;
  gymId!: string | null;
  userId!: string;
  userName!: string;
  action!: string;
  entityType!: string;
  entityId!: string;
  entityName!: string | null;
  metadata!: any;
  ipAddress!: string | null;
  createdAt!: string;
}

export class AuditLogListSchema {
  data!: AuditLogSchema[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export function ApiAuditLogListResponse() {
  return applyDecorators(
    ApiOkResponse({
      description: 'List of audit logs',
      type: AuditLogListSchema,
    }),
  );
}
