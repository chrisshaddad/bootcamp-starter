// Shared query-string builder for the audit listings. The platform console
// (`/audit`) and the pharmacy console (`/audit/pharmacy`) accept the same
// optional action/entity/userId filters, so both hooks build the query here to
// stay in sync when the filter set changes. Returns a bare query string (no
// leading `?`); empty when no filters are set.
export function buildAuditQuery(options: {
  action?: string;
  entity?: string;
  userId?: string;
}): string {
  const params = new URLSearchParams();
  if (options.action) params.set('action', options.action);
  if (options.entity) params.set('entity', options.entity);
  if (options.userId) params.set('userId', options.userId);
  return params.toString();
}
