export const ANALYTICS_QUEUE = 'analytics';

export const ANALYTICS_JOBS = {
  RECORD_VISIT: 'record-visit',
} as const;

export const ANALYTICS_VISITOR_COOKIE = 'deployfolio_analytics_visitor';
export const ANALYTICS_VISITOR_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
export const ANALYTICS_DEDUPE_WINDOW_MS = 30 * 60 * 1000;
